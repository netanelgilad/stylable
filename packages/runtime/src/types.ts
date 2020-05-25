export type StateValue = boolean | number | string;

export interface StateMap {
    [stateName: string]: StateValue;
}

export interface AttributeMap {
    className?: string;
    [attributeName: string]: StateValue | undefined;
}

export interface InheritedAttributes {
    className?: string;
    [props: string]: any;
}

export type StylableExports = StylableExportsBase<
    Record<string, string>,
    Record<string, string>,
    Record<string, string>,
    Record<string, string>
>;

export type STFunction = (
    context: string,
    stateOrClass?: string | StateMap | undefined,
    ...classes: Array<string | undefined>
) => string;

export interface StylableExportsBase<
    CLASSES extends Record<string, string>,
    KEYFRAMES extends Record<string, string>,
    VARS extends Record<string, string>,
    ST_VARS extends Record<string, string>
> {
    classes: CLASSES;
    keyframes: KEYFRAMES;
    vars: VARS;
    stVars: ST_VARS;
}

export interface RuntimeStylesheetBase<
    NAMESPACE,
    CLASSES extends Record<string, string>,
    KEYFRAMES extends Record<string, string>,
    VARS extends Record<string, string>,
    ST_VARS extends Record<string, string>
> extends StylableExportsBase<CLASSES, KEYFRAMES, VARS, ST_VARS>, RenderableStylesheet {
    namespace: NAMESPACE;
    cssStates: (stateMap: StateMap) => string;
    style: STFunction;
    st: STFunction;
}

export type RuntimeStylesheet = RuntimeStylesheetBase<
    string,
    Record<string, string>,
    Record<string, string>,
    Record<string, string>,
    Record<string, string>
>;

export interface NodeRenderer<I, O extends Element> {
    update(stylesheet: I, node: O): O;
    create(stylesheet: I, key: string | number): O;
    renderKey(stylesheet: I): string | number;
    hasKey(node: O): boolean;
}

export interface RenderableStylesheet {
    $depth: number;
    $id: string | number;
    $css?: string;
}
