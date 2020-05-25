import { RuntimeRenderer } from './css-runtime-renderer';
import { StateMap, StateValue, RuntimeStylesheetBase, StylableExportsBase } from './types';

const stateMiddleDelimiter = '-';
const booleanStateDelimiter = '--';
const stateWithParamDelimiter = '---';

export function create<
    NAMESPACE extends string,
    ID extends string | number,
    CLASSES extends Record<string, string>,
    KEYFRAMES extends Record<string, string>,
    VARS extends Record<string, string>,
    ST_VARS extends Record<string, string>
>(
    namespace: NAMESPACE,
    exports: StylableExportsBase<CLASSES, KEYFRAMES, VARS, ST_VARS>,
    css: string,
    depth: number,
    id: ID,
    renderer: RuntimeRenderer | null
): RuntimeStylesheetBase<NAMESPACE, CLASSES, KEYFRAMES, VARS, ST_VARS> {
    const stylesheet: RuntimeStylesheetBase<NAMESPACE, CLASSES, KEYFRAMES, VARS, ST_VARS> = {
        namespace,
        classes: exports.classes,
        keyframes: exports.keyframes,
        vars: exports.vars,
        stVars: exports.stVars,
        cssStates,
        style,
        st: style,
        $id: id,
        $depth: depth,
        $css: css,
    };

    if (renderer) {
        renderer.register(stylesheet);
    }

    function cssStates(stateMapping?: StateMap | null): string {
        const classNames = [];
        for (const stateName in stateMapping) {
            const stateValue = stateMapping[stateName];
            const stateClass = createStateClass(stateName, stateValue);
            if (stateClass) {
                classNames.push(stateClass);
            }
        }
        return classNames.join(' ');
    }

    function createBooleanStateClassName(stateName: string) {
        return `${namespace}${booleanStateDelimiter}${stateName}`;
    }

    function createStateWithParamClassName(stateName: string, param: string) {
        return `${namespace}${stateWithParamDelimiter}${stateName}${stateMiddleDelimiter}${
            param.length
        }${stateMiddleDelimiter}${param.replace(/\s/gm, '_')}`;
    }

    function createStateClass(stateName: string, stateValue: StateValue): string {
        if (
            stateValue === false ||
            stateValue === undefined ||
            stateValue === null ||
            stateValue !== stateValue // check NaN
        ) {
            return '';
        }

        if (stateValue === true) {
            // boolean state
            return createBooleanStateClassName(stateName);
        }

        const valueAsString = stateValue.toString();

        return createStateWithParamClassName(stateName, valueAsString);
    }

    function style() {
        const classNames = [];

        for (let i = 0; i < arguments.length; i++) {
            // eslint-disable-next-line prefer-rest-params
            const item = arguments[i];

            if (item) {
                if (typeof item === 'string') {
                    classNames[classNames.length] = item;
                } else if (i === 1) {
                    for (const stateName in item) {
                        const stateValue = item[stateName];
                        const stateClass = createStateClass(stateName, stateValue);
                        if (stateClass) {
                            classNames[classNames.length] = stateClass;
                        }
                    }
                }
            }
        }
        return classNames.join(' ');
    }

    return stylesheet;
}

export function createRenderable(css: string, depth: number | string, id: number | string) {
    return { $css: css, $depth: depth, $id: id, $theme: true };
}

enum StateType {
    Bool = 1,
    Value = 2,
}

const locals = { root: '', local: '' };

const o = {
    root: { stateX: StateType.Bool, stateY: StateType.Value },
    local: { state1: StateType.Bool, state2: StateType.Value },
    local2: { state1: StateType.Value },
} as const;

type MapByType<X> = X extends StateType.Bool ? boolean : string | number;
type MapByType2<X> = X extends StateType.Bool ? boolean : X extends StateType.Value ? string | number : {[Y in keyof X]: MapByType2<X[Y]>};

type U = typeof o;
type U1 = U[keyof U];
type U4 = MapByType2<U1>

type U5 = {[K in keyof UnionToIntersection<U4>]: UnionToIntersection<U4>[K]};
type U6 = string & boolean;
type U2 = {[K in U1]: K}
// type U3 = UnionToIntersection<U1>
type UnionToIntersection<U> = 
  (U extends any ? (k: U)=>void : never) extends ((k: infer I)=>void) ? I : never



// type U2 = {[K in keyof U1]: K}
type X = Partial<{ [K in  U[keyof U]]: MapByType<U[keyof U][K]> }>

function getState<T extends keyof typeof locals, U extends typeof o>(
    states: Partial<{ [K in keyof U[keyof U]]: MapByType<U[keyof U][K]> }>,
): string;
function getState<T extends keyof typeof locals, U extends typeof o>(
    states: Partial<{ [K in keyof U[T]]: MapByType<U[T][K]> }>,
    local?: T
): string {
    return '';
}

getState({}, '');
