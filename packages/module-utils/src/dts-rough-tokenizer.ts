import {
    Descriptors,
    Seeker,
    Token,
    createToken,
    getUnclosedComment,
    getJSCommentStartType,
    isComment,
    isCommentEnd,
    isStringDelimiter,
    isWhitespace,
    tokenize,
} from '@tokey/core';

type Delimiters =
    | ':'
    | ';'
    | '*'
    | '/'
    | '.'
    | ','
    | '('
    | ')'
    | '{'
    | '}'
    | '>'
    | '='
    | '<'
    | '|'
    | '?'
    | '['
    | ']'
    | '+'
    | '-'
    | '~'
    | '^'
    | '&'
    | '%'
    | '!'
    | '\n';

export type DTSCodeToken = Token<Descriptors | Delimiters>;

export function tokenizeDTS(source: string) {
    return findDtsTokens(
        tokenize<DTSCodeToken>(source, {
            isDelimiter,
            isStringDelimiter,
            isWhitespace,
            shouldAddToken,
            createToken,
            getCommentStartType: getJSCommentStartType,
            isCommentEnd,
            getUnclosedComment,
        })
    );
}

export function getLocalClassStates(local: string, tokens: TokenizedDtsEntry[]) {
    const classes = tokens.find(({ type }) => type === 'classes') as ClassesToken;
    const token = classes?.tokens.find(({ value }) => value === `"${local}"`);
    if (token?.outputValue) {
        const stateName = token?.outputValue.value;
        const states = tokens.find(({ type }) => type === 'states') as StatesToken;
        const classStates = states?.tokens.find(({ className: { value } }) => value === stateName);
        if (classStates) {
            return classStates.classStates;
        }
    }
    throw new Error(`Could not find states for class ${local}`);
}

const isDelimiter = (char: string) =>
    char === ':' ||
    char === ';' ||
    char === '*' ||
    char === '/' ||
    char === '.' ||
    char === ',' ||
    char === '(' ||
    char === ')' ||
    char === '{' ||
    char === '}' ||
    char === '>' ||
    char === '=' ||
    char === '<' ||
    char === '|' ||
    char === '?' ||
    char === '[' ||
    char === ']' ||
    char === '+' ||
    char === '-' ||
    char === '~' ||
    char === '^' ||
    char === '&' ||
    char === '%' ||
    char === '!' ||
    char === '\n';

export type TokenizedDtsEntry =
    | ClassesToken
    | VarsToken
    | StVarsToken
    | KeyframesToken
    | StatesToken;
export type RelevantKeys = 'classes' | 'vars' | 'stVars' | 'keyframes';

export interface DtsToken extends DTSCodeToken {
    line: number;
    column: number;
    outputValue?: DtsToken;
}

export type ClassStateToken = { stateName: DtsToken; type: DtsToken[] };

export type ClassesToken = { type: 'classes'; tokens: DtsToken[]; start: number; end: number };
export type VarsToken = { type: 'vars'; tokens: DtsToken[]; start: number; end: number };
export type StVarsToken = { type: 'stVars'; tokens: DtsToken[]; start: number; end: number };
export type KeyframesToken = { type: 'keyframes'; tokens: DtsToken[]; start: number; end: number };
export type StatesToken = {
    type: 'states';
    tokens: { className: DtsToken; classStates: ClassStateToken[] }[];
    start: number;
    end: number;
};

const shouldAddToken = (type: DTSCodeToken['type']) =>
    isComment(type) || type === 'space' ? false : true;

function isRelevantKey(name: string): name is RelevantKeys {
    return name === 'classes' || name === 'vars' || name === 'stVars' || name === 'keyframes';
}

function findDtsTokens(tokens: DTSCodeToken[]) {
    const s = new Seeker(tokens);
    const dtsTokens: TokenizedDtsEntry[] = [];
    let t;
    const lastNewLinePosition = { line: 0, columm: 0 };

    while ((t = s.next())) {
        if (!t.type) {
            break;
        }

        if (t.type === '\n') {
            lastNewLinePosition.line += 1;
            lastNewLinePosition.columm = t.end;
        } else if (t.value === 'type' && s.peek().value === 'states') {
            const start = t.start;
            s.next(); // states
            s.next(); // =

            const states: StatesToken = {
                type: 'states',
                tokens: [],
                start,
                end: -1,
            };
            dtsTokens.push(states);

            while ((t = s.next())) {
                if (!t.type || t.type === '}') {
                    break;
                }

                if (t.type === '\n') {
                    lastNewLinePosition.line += 1;
                    lastNewLinePosition.columm = t.end;
                } else if (t.type === 'string') {
                    const className: DtsToken = {
                        ...t,
                        line: lastNewLinePosition.line,
                        column: t.start - lastNewLinePosition.columm,
                    };
                    const classStates: ClassStateToken[] = [];
                    let current: { stateName?: DtsToken; type: DtsToken[] } = {
                        stateName: undefined,
                        type: [],
                    };
                    while ((t = s.next())) {
                        if (!t.type || t.type === '}') {
                            break;
                        }

                        if (t.type === '\n') {
                            lastNewLinePosition.line += 1;
                            lastNewLinePosition.columm = t.end;
                        } else if (t.type === ';') {
                            current = {
                                stateName: undefined,
                                type: [],
                            };
                        } else if (current.stateName) {
                            current.type.push({
                                ...t,
                                line: lastNewLinePosition.line,
                                column: t.start - lastNewLinePosition.columm,
                            });
                        } else if (t.type === 'string') {
                            current.stateName = {
                                ...t,
                                line: lastNewLinePosition.line,
                                column: t.start - lastNewLinePosition.columm,
                            };
                            classStates.push(current as Required<typeof current>);
                            s.next(); // ?
                            s.next(); // :
                        }
                    }

                    states.tokens.push({
                        className,
                        classStates,
                    });
                }
            }

            states.end = t.end;
        } else if (
            t.value === 'declare' &&
            s.peek().value === 'const' &&
            isRelevantKey(s.peek(2).value)
        ) {
            const start = t.start;
            s.next(); // const
            const declareType = s.next(); // name
            s.next(); // ;

            const resTokens: DtsToken[] = []; // {...resTokens[]}
            while ((t = s.next())) {
                if (!t.type || t.type === '}') {
                    break;
                }

                if (t.type === '\n') {
                    lastNewLinePosition.line += 1;
                    lastNewLinePosition.columm = t.end;
                } else if (t.type === 'string') {
                    s.next(); // :
                    const value = s.next(); // value
                    s.next(); // ;
                    resTokens.push({
                        ...t,
                        line: lastNewLinePosition.line,
                        column: t.start - lastNewLinePosition.columm,
                        outputValue: {
                            ...value,
                            line: lastNewLinePosition.line,
                            column: value.start - lastNewLinePosition.columm,
                        },
                    });
                }
            }

            const end = t.end;
            dtsTokens.push({
                type: declareType.value as RelevantKeys,
                tokens: resTokens,
                start,
                end,
            });
        }
    }

    return dtsTokens;
}
