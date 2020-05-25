import { StylableResults } from '@stylable/core';

export function generateModuleSource(
    stylableResult: StylableResults,
    moduleId: string,
    beforeModule: string[],
    renderer: string,
    createFunction: string,
    createRenderableFunction: string,
    css: string,
    depth: string,
    exportsArgument: string,
    afterModule: string,
    renderableOnly = false,
    useAsConst = false
): string {
    const { exports, meta } = stylableResult;
    const localsExports = JSON.stringify(exports);
    const namespace = JSON.stringify(meta.namespace);
    if (renderableOnly) {
        return `${createRenderableFunction}(${css}, ${depth}, ${moduleId});`;
    }
    return `
${beforeModule.join('\n')}
${exportsArgument} = ${createFunction}(
    ${namespace}${useAsConst ? ' as const' : ''},
    ${localsExports} ${useAsConst ? ' as const' : ''},
    ${css},
    ${depth},
    ${moduleId} ${useAsConst ? ' as const' : ''},
    ${renderer}
);
${afterModule}
`;
}

export function createModuleSource(
    stylableResult: StylableResults,
    moduleFormat = 'cjs',
    includeCSSInJS: boolean,
    moduleId = JSON.stringify(stylableResult.meta.namespace),
    renderableOnly = false,
    depth: string | number = '-1',
    staticRequests: string[] = [],
    runtimeRequest = '@stylable/runtime',
    afterModule: string[] = []
) {
    // TODO: calc depth for node as well
    depth = typeof depth === 'number' ? depth.toString() : depth;

    if (renderableOnly && !includeCSSInJS) {
        // TODO: better error
        throw new Error('Configuration conflict (renderableOnly && !includeCSSInJS)');
    }
    const cssString = includeCSSInJS
        ? JSON.stringify(stylableResult.meta.outputAst!.toString())
        : '""';

    switch (moduleFormat) {
        case 'dts':
            return generateTypescriptDefinition();
        case '  ': {
            const importKey = renderableOnly ? 'createRenderable' : 'create';
            return generateModuleSource(
                stylableResult,
                moduleId,
                [
                    ...staticRequests.map((request) => `import ${JSON.stringify(request)}`),
                    `import { $, ${importKey} } from ${JSON.stringify(runtimeRequest)}`,
                ],
                `$`,
                `create`,
                `createRenderable`,
                cssString,
                depth,
                'const { classes, keyframes, vars, stVars, cssStates, namespace, style, st, $depth, $id, $css }', // = $
                [
                    `export { classes, keyframes, vars, stVars, cssStates, namespace, style, st, $depth, $id, $css };`,
                    ...afterModule,
                ].join('\n'),
                renderableOnly
            );
        }
        case 'ts': {
            const importKey = renderableOnly ? 'createRenderable' : 'create';
            return generateModuleSource(
                stylableResult,
                moduleId,
                [
                    ...staticRequests.map((request) => `import ${JSON.stringify(request)}`),
                    `import { $, ${importKey} } from ${JSON.stringify(runtimeRequest)}`,
                ],
                `$`,
                `create`,
                `createRenderable`,
                cssString,
                depth,
                'const { classes, keyframes, vars, stVars, cssStates, namespace, style, st, $depth, $id, $css }', // = $
                [
                    `export  { classes, keyframes, vars, stVars, cssStates, namespace, style, st, $depth, $id, $css };`,
                    ...afterModule,
                ].join('\n'),
                renderableOnly,
                true
            );
        }
        case 'cjs':
            return generateModuleSource(
                stylableResult,
                moduleId,
                [
                    ...staticRequests.map((request) => `require(${JSON.stringify(request)})`),
                    `const runtime = require(${JSON.stringify(runtimeRequest)})`,
                ],
                `runtime.$`,
                `runtime.create`,
                `runtime.createRenderable`,
                cssString,
                depth,
                'module.exports',
                afterModule.join('\n'),
                renderableOnly
            );
            case 'ts-cjs':
            return generateModuleSource(
                stylableResult,
                moduleId,
                [
                    ...staticRequests.map((request) => `require(${JSON.stringify(request)})`),
                    `import runtime = require(${JSON.stringify(runtimeRequest)})`,
                ],
                `runtime.$`,
                `runtime.create`,
                `runtime.createRenderable`,
                cssString,
                depth,
                'export ',
                afterModule.join('\n'),
                renderableOnly, 
                true
            );
    }
    throw new Error('Unknown module format ' + moduleFormat);
}

function generateTypescriptDefinition(): string {
    throw new Error('Not implemented');
}
