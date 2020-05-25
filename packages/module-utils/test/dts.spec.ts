import { expect } from 'chai';
import { createModuleSource } from '../src/module-source';
import { Stylable } from '@stylable/core/src';
import { typescriptSupport } from 'packages/language-service/src/lib/typescript-support';

import { createMemoryFs } from '@file-services/memory';
import { nodeFs } from '@file-services/node';
import { createOverlayFs } from '@file-services/overlay';

describe('DTS Factory', () => {
    it('should create dts for st.css (cjs format)', () => {
        const testFile = '/entry.st.css';

        const fileSystem = createMemoryFs();
        const overlay = createOverlayFs(nodeFs, fileSystem);

        fileSystem.writeFileSync(
            testFile,
            `
        :vars {myColor: red} 
        .root {--myVar: green} 
        @keyframes in {}
        `
        );

        const stylable = Stylable.create({ projectRoot: '/', fileSystem });
        const meta = stylable.process(testFile);
        const res = stylable.transform(meta);
        const source = createModuleSource(res, 'ts-cjs', false);

        fileSystem.writeFileSync('out.ts', source);

        const languageService = typescriptSupport(overlay);

        languageService.setOpenedFiles(['out.ts']);
        const out = languageService.ts.getEmitOutput('out.ts', true, true);

        expect(out).to.deep.include({ XXX: false });
    });
});
