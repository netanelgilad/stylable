import { isAsset, Stylable } from '@stylable/core';
import {
    createModuleSource,
    generateDTSContent,
    generateDTSSourceMap,
} from '@stylable/module-utils';
import { StylableOptimizer } from '@stylable/optimizer';
import { ensureDirectory, handleDiagnostics, tryRun } from './build-tools';
import { nameTemplate } from './name-template';
import type { Log } from './logger';
import type { DiagnosticMessages } from './report-diagnostics';

export interface BuildCommonOptions {
    fullOutDir: string;
    filePath: string;
    fullSrcDir: string;
    log: Log;
    fs: any;
    moduleFormats: string[];
    outputCSS?: boolean;
    outputCSSNameTemplate?: string;
    outputSources?: boolean;
    generated?: Set<string>;
    mode?: string;
    dts?: boolean;
    dtsSourceMap?: boolean;
}

export interface BuildFileOptions extends BuildCommonOptions {
    stylable: Stylable;
    diagnosticsMessages: DiagnosticMessages;
    projectAssets: Set<string>;
    includeCSSInJS?: boolean;
    useNamespaceReference?: boolean;
    injectCSSRequest?: boolean;
    optimize?: boolean;
    minify?: boolean;
}

export function buildSingleFile({
    fullOutDir,
    filePath,
    fullSrcDir,
    log,
    fs,
    moduleFormats,
    outputCSS = false,
    outputCSSNameTemplate = '[filename].css',
    outputSources = false,
    generated = new Set<string>(),
    mode = '[Build]',
    // build specific
    stylable,
    includeCSSInJS = false,
    diagnosticsMessages,
    projectAssets,
    useNamespaceReference = false,
    injectCSSRequest = false,
    optimize = false,
    minify = false,
    dts = false,
    dtsSourceMap,
}: BuildFileOptions) {
    const { basename, dirname, join, relative, resolve } = fs;
    const outSrcPath = join(fullOutDir, filePath.replace(fullSrcDir, ''));
    const outPath = outSrcPath + '.js';
    const fileDirectory = dirname(filePath);
    const outDirPath = dirname(outPath);
    const cssAssetFilename = nameTemplate(outputCSSNameTemplate, {
        filename: basename(outSrcPath, '.st.css'),
    });
    const cssAssetOutPath = join(dirname(outSrcPath), cssAssetFilename);
    const outputLogs: string[] = [];
    log(mode, filePath);

    tryRun(() => ensureDirectory(outDirPath, fs), `Ensure directory: ${outDirPath}`);
    let content: string = tryRun(
        () => fs.readFileSync(filePath).toString(),
        `Read File Error: ${filePath}`
    );
    const res = stylable.transform(content, filePath);
    const optimizer = new StylableOptimizer();
    if (optimize) {
        optimizer.optimize(
            {
                removeComments: true,
                removeEmptyNodes: true,
                removeStylableDirectives: true,
                classNameOptimizations: false,
                removeUnusedComponents: false,
            },
            res,
            {}
        );
    }
    handleDiagnostics(res, diagnosticsMessages, filePath);
    // st.css
    if (outputSources) {
        if (outSrcPath === filePath) {
            throw new Error(`Attempt to override source file ${outSrcPath}`);
        }
        if (useNamespaceReference && !content.includes('st-namespace-reference')) {
            const relativePathToSource = relative(dirname(outSrcPath), filePath).replace(
                /\\/gm,
                '/'
            );
            const srcNamespaceAnnotation = `/* st-namespace-reference="${relativePathToSource}" */\n`;
            content = srcNamespaceAnnotation + content;
        }
        generated.add(outSrcPath);
        outputLogs.push(`.st.css source`);
        tryRun(() => fs.writeFileSync(outSrcPath, content), `Write File Error: ${outSrcPath}`);
    }
    // st.css.js
    moduleFormats.forEach((format) => {
        outputLogs.push(`${format} module`);
        const code = tryRun(
            () =>
                createModuleSource(
                    res,
                    format,
                    includeCSSInJS,
                    undefined,
                    undefined,
                    undefined,
                    injectCSSRequest ? [`./${cssAssetFilename}`] : [],
                    '@stylable/runtime'
                ),
            `Transform Error: ${filePath}`
        );
        const outFilePath = outSrcPath + (format === 'esm' ? '.mjs' : '.js');
        generated.add(outFilePath);
        tryRun(() => fs.writeFileSync(outFilePath, code), `Write File Error: ${outFilePath}`);
    });
    // .css
    if (outputCSS) {
        let cssCode = res.meta.outputAst!.toString();
        if (minify) {
            cssCode = optimizer.minifyCSS(cssCode);
        }
        generated.add(cssAssetOutPath);
        outputLogs.push('transpiled css');
        tryRun(
            () => fs.writeFileSync(cssAssetOutPath, cssCode),
            `Write File Error: ${cssAssetOutPath}`
        );
    }
    // .d.ts
    if (dts) {
        const dtsContent = generateDTSContent(res);
        const dtsPath = outSrcPath + '.d.ts';

        generated.add(dtsPath);
        outputLogs.push('output .d.ts');

        tryRun(() => fs.writeFileSync(dtsPath, dtsContent), `Write File Error: ${dtsPath}`);

        // .d.ts.map
        // if not explicitly defined, assumed true with "--dts" parent scope
        if (dtsSourceMap !== false) {
            const dtsMappingContent = generateDTSSourceMap(dtsContent, res.meta);
            const dtsMapPath = outSrcPath + '.d.ts.map';

            generated.add(dtsMapPath);
            outputLogs.push('output .d.ts.mp');

            tryRun(
                () => fs.writeFileSync(dtsMapPath, dtsMappingContent),
                `Write File Error: ${dtsMapPath}`
            );
        }
    }

    log(mode, `output: [${outputLogs.join(', ')}]`);
    // copy assets
    for (const url of res.meta.urls) {
        if (isAsset(url)) {
            projectAssets.add(resolve(fileDirectory, url));
        }
    }
}

export function removeBuildProducts({
    fullOutDir,
    filePath,
    fullSrcDir,
    log,
    fs,
    moduleFormats,
    outputCSS = false,
    outputCSSNameTemplate = '[filename].css',
    outputSources = false,
    generated = new Set<string>(),
    mode = '[Build]',
    dts = false,
    dtsSourceMap,
}: BuildCommonOptions) {
    const { basename, dirname, join } = fs;
    const outSrcPath = join(fullOutDir, filePath.replace(fullSrcDir, ''));
    const cssAssetFilename = nameTemplate(outputCSSNameTemplate, {
        filename: basename(outSrcPath, '.st.css'),
    });
    const cssAssetOutPath = join(dirname(outSrcPath), cssAssetFilename);
    const outputLogs: string[] = [];
    log(mode, filePath);

    // st.css
    if (outputSources) {
        if (outSrcPath === filePath) {
            throw new Error(`Attempt to remove source file ${outSrcPath}`);
        }
        generated.delete(outSrcPath);
        outputLogs.push(`.st.css source`);
        tryRun(() => fs.unlinkSync(outSrcPath), `Unlink File Error: ${outSrcPath}`);
    }
    // st.css.js
    moduleFormats.forEach((format) => {
        outputLogs.push(`${format} module`);
        const outFilePath = outSrcPath + (format === 'esm' ? '.mjs' : '.js');
        generated.delete(outFilePath);
        tryRun(() => fs.unlinkSync(outFilePath), `Unlink File Error: ${outFilePath}`);
    });
    // .css
    if (outputCSS) {
        generated.delete(cssAssetOutPath);
        outputLogs.push('transpiled css');
        tryRun(() => fs.unlinkSync(cssAssetOutPath), `Unlink File Error: ${cssAssetOutPath}`);
    }
    // .d.ts
    if (dts) {
        const dtsPath = `${outSrcPath}.d.ts`;
        generated.delete(dtsPath);
        outputLogs.push('generated .d.ts');
        tryRun(() => fs.unlinkSync(dtsPath), `Unlink File Error: ${dtsPath}`);
    }
    // .d.ts.map
    if (dtsSourceMap) {
        const dtsMapPath = `${outSrcPath}.d.ts.map`;
        generated.delete(dtsMapPath);
        outputLogs.push('generated .d.ts.map');
        tryRun(() => fs.unlinkSync(dtsMapPath), `Unlink File Error: ${dtsMapPath}`);
    }

    log(mode, `removed: [${outputLogs.join(', ')}]`);
}
