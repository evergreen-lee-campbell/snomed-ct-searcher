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
const apiRoot = "https://termbrowser.nhs.uk/sct-browser-api/snomed/uk-edition/v20191001";
const sessionStorageName = "codes";
class SearchOptions {
}
function getInitialConcept(code) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Searching for: ' + code);
        let requestPath = "";
        let isDescription = false;
        if (/.*[a-zA-Z].*/.test(code)) {
            requestPath += `/descriptions?query=${encodeURIComponent(code)}&limit=1&searchMode=partialMatching&lang=english&returnLimit=1&normalize=true`;
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
        if (!initialResponse) {
            console.log('Search returned zero results.');
            return;
        }
        if (isDescription) {
            try {
                initialResponse = yield fetch(apiRoot + "/concepts/" + initialResponse.matches[0].conceptId);
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
                if (complexChild.statedDescendants > 0 && (options === undefined ? true : currentDepth < (options.depthLimit || Number.POSITIVE_INFINITY))) {
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
        let childCodes = [];
        childCodes.push({
            conceptId: topLevelConcept.conceptId,
            defaultTerm: topLevelConcept.defaultTerm,
            searchTerm: code,
            descriptions: topLevelConcept.descriptions.map((d) => { return { term: d.term, descriptionId: d.descriptionId }; })
        });
        if (topLevelConcept.statedDescendants > 0) {
            yield appendAllChildren(childCodes, topLevelConcept, 0, options);
        }
        return childCodes;
    });
}
function toCSVOctetStream(childCodes) {
    let streamChars = encodeURIComponent("\"conceptId\",\"term\",\"descriptionId\"\n");
    childCodes.forEach(c => {
        c.descriptions.forEach(d => {
            console.log(d.term);
            streamChars += encodeURIComponent(`"${c.conceptId}", "${d.term}", "${d.descriptionId}"\n`);
        });
    });
    return streamChars;
}
export function _getChildCodes() {
    return __awaiter(this, void 0, void 0, function* () {
        let downloadA = $('#download');
        downloadA.hide();
        let goButton = $('#go');
        goButton.attr('disabled');
        let searchValue = $('#search').val();
        let result = yield getChildCodes(searchValue);
        sessionStorage.setItem(sessionStorageName, JSON.stringify(result));
        goButton.removeAttr('disabled');
        _download();
    });
}
export function _download() {
    let downloadA = $('#download');
    let childCodes = JSON.parse(sessionStorage.getItem(sessionStorageName) || "");
    downloadA.attr('href', `data:application/octet-stream,${toCSVOctetStream(childCodes)}`);
    downloadA.attr('download', ($('#search').val() || childCodes[0].defaultTerm || Date.now()) + ".csv");
    downloadA.show();
}
//# sourceMappingURL=index.js.map