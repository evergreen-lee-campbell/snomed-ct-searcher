/// <reference types="jquery" />
declare class SearchOptions {
    depthLimit?: number;
}
export declare function getChildCodes(code: string, options?: SearchOptions): Promise<any>;
export declare function _getChildCodes(): Promise<void>;
export declare function _download(overlay: JQuery<HTMLElement>, goButton: JQuery<HTMLElement>): void;
export {};
