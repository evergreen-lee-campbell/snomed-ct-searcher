export interface SimpleSnomed {
    conceptId: string;
    defaultTerm: string;
    descriptions: SimpleSnomedDescription[];
    searchTerm?: string;
    parentConceptId?: string;
}
interface SimpleSnomedDescription {
    descriptionId: string;
    term: string;
}
export {};
