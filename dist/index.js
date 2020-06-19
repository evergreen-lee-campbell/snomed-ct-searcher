var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import $ from 'jquery';
import fetch from 'node-fetch';
import Levenshtein from 'levenshtein';
const apiRoot = 'https://termbrowser.nhs.uk/sct-browser-api/snomed/uk-edition/v20200610';
const sessionStorageName = "codes";
class SearchOptions {
}
function getInitialConcept(code) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Searching for: ' + code);
        let requestPath = "";
        let isDescription = false;
        if (/.*[a-zA-Z].*/.test(code)) {
            requestPath += `/descriptions?query=${encodeURIComponent(code)}&limit=10&searchMode=partialMatching&lang=english&returnLimit=10&normalize=true`;
            isDescription = true;
        }
        else if (/^[0-9]*$/.test(code)) {
            requestPath += `/concepts/${code}`;
        }
        if (isDescription) {
            console.log('Performing description search');
        }
        else {
            console.log('Performing concept search.');
        }
        let initialResponse;
        console.log('Making a request to ' + apiRoot + requestPath);
        try {
            initialResponse = yield fetch(apiRoot + requestPath);
            initialResponse = yield initialResponse.json();
        }
        catch (ex) {
            console.error(ex);
            return ex;
        }
        if (isDescription && (!initialResponse || !initialResponse.matches || initialResponse.matches.length < 1)) {
            console.log('Search returned zero results');
            return;
        }
        if (!isDescription && !initialResponse) {
            try {
                console.log('Attempting description search...');
                initialResponse = yield fetch(apiRoot + "/descriptions/" + code);
                initialResponse = yield initialResponse.json();
                isDescription = true;
            }
            catch (ex) {
                console.error(ex);
                return ex;
            }
        }
        console.log('Initial concept response:');
        console.log(initialResponse);
        if (!initialResponse) {
            console.log('Search returned zero results.');
            return;
        }
        if (isDescription && initialResponse.matches && initialResponse.matches.length > 0) {
            try {
                let conceptId = initialResponse.matches.sort((a, b) => {
                    let levA = new Levenshtein(a.term, code);
                    let levB = new Levenshtein(b.term, code);
                    return levA.distance < levB.distance;
                })[0].conceptId;
                initialResponse = yield fetch(apiRoot + "/concepts/" + conceptId);
                initialResponse = yield initialResponse.json();
            }
            catch (ex) {
                console.error(ex);
                return;
            }
        }
        return initialResponse;
    });
}
function appendAllChildren(childCodes, sourceConcept, currentDepth, options) {
    return __awaiter(this, void 0, void 0, function* () {
        let simpleChildren;
        currentDepth++;
        try {
            simpleChildren = yield fetch(`${apiRoot}/concepts/${sourceConcept.conceptId}/children?form=inferred`);
            simpleChildren = yield simpleChildren.json();
        }
        catch (ex) {
            console.error(ex);
            return ex;
        }
        if (!simpleChildren || simpleChildren.length < 1)
            return;
        for (let i = 0; i < simpleChildren.length; i++) {
            try {
                let complexChild = yield fetch(`${apiRoot}/concepts/${simpleChildren[i].conceptId}`);
                complexChild = yield complexChild.json();
                childCodes.push({
                    conceptId: complexChild.conceptId,
                    defaultTerm: complexChild.defaultTerm,
                    searchTerm: simpleChildren[i].conceptId,
                    descriptions: complexChild.descriptions.map((d) => { return { term: d.term, descriptionId: d.descriptionId }; })
                });
                if (options === undefined ? true : currentDepth < (options.depthLimit || Number.POSITIVE_INFINITY)) {
                    yield appendAllChildren(childCodes, complexChild, currentDepth, options);
                }
            }
            catch (ex) {
                console.error(ex);
                throw ex;
            }
        }
        if (options && options.depthLimit && currentDepth >= options.depthLimit) {
            return childCodes;
        }
        return childCodes;
    });
}
export function getChildCodes(code, options) {
    return __awaiter(this, void 0, void 0, function* () {
        let topLevelConcept;
        try {
            topLevelConcept = yield getInitialConcept(code);
            console.log(topLevelConcept);
        }
        catch (ex) {
            console.error(ex);
            return ex;
        }
        if (!topLevelConcept)
            return;
        let childCodes = [];
        childCodes.push({
            conceptId: topLevelConcept.conceptId,
            defaultTerm: topLevelConcept.defaultTerm,
            searchTerm: code,
            descriptions: topLevelConcept.descriptions.map((d) => { return { term: d.term, descriptionId: d.descriptionId }; })
        });
        yield appendAllChildren(childCodes, topLevelConcept, 0, options);
        return childCodes;
    });
}
function toCSVOctetStream(childCodes) {
    let streamChars = encodeURIComponent("conceptId\tterm\tdescriptionId\n");
    childCodes.forEach(c => {
        c.descriptions.forEach(d => {
            console.log(d.term);
            streamChars += encodeURIComponent(`${c.conceptId}\t${d.term}\t${d.descriptionId}\n`);
        });
    });
    return streamChars;
}
export function _getChildCodes() {
    return __awaiter(this, void 0, void 0, function* () {
        let downloadA = $('#download');
        downloadA.hide();
        $('.error').hide();
        let goButton = $('#go');
        goButton.attr('disabled');
        let overlay = $('#overlay');
        overlay.show();
        let searchValue = $('#search').val();
        let result = yield getChildCodes(searchValue);
        sessionStorage.setItem(sessionStorageName, JSON.stringify(result));
        _download(overlay, goButton);
    });
}
export function _download(overlay, goButton) {
    let downloadA = $('#download');
    let childCodes;
    try {
        childCodes = JSON.parse(sessionStorage.getItem(sessionStorageName) || "");
        downloadA.attr('href', `data:application/octet-stream,${toCSVOctetStream(childCodes)}`);
        downloadA.attr('download', ($('#search').val() || childCodes[0].defaultTerm || Date.now()) + ".tsv");
        downloadA.show();
    }
    catch (ex) {
        $('.error').show();
        $('.error #message').text('Could not retrieve child SNOMED codes.');
        $('.error #detailedMessage').text(ex.message);
    }
    overlay.hide();
    goButton.removeAttr('disabled');
}
//# sourceMappingURL=index.js.map