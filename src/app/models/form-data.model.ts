export interface FormData {
    projectName: string;
    apiToken: string;
    email: string;
    teams: Array<string>;
    sprints: string;
    includeDone: boolean;
    includeExternal: boolean;
}
