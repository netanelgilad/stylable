import type { StylableResults } from '@stylable/core';
import { expect } from 'chai';
import type * as postcss from 'postcss';

export function mediaQuery(chai: Chai.ChaiStatic, util: Chai.ChaiUtils) {
    const { flag } = util;

    chai.Assertion.addMethod('mediaQuery', function (index: number) {
        const actual = flag(this, 'object') as StylableResults;

        if (!actual.meta || !actual.exports) {
            throw new Error(
                `expected Stylable result {meta, exports}, but got: {${Object.keys(actual).join(
                    ', '
                )}}`
            );
        }

        const { outputAst } = actual.meta;
        if (!outputAst) {
            throw new Error(`expected result to be transformed - missing outputAst on meta`);
        }

        const nodes = outputAst.nodes;

        if (!nodes) {
            throw new Error(`no rules found for media`);
        }

        const media = nodes[index];

        if (!media || media.type !== 'atrule') {
            throw new Error(`no media found at index #${index}`);
        }

        flag(this, 'actualRule', media);
    });
}

export function styleRules(chai: Chai.ChaiStatic, util: Chai.ChaiUtils) {
    const { flag } = util;

    chai.Assertion.addMethod(
        'styleRules',
        function (styleRules: string[] | { [key: number]: string }) {
            const actual = flag(this, 'object') as StylableResults;
            if (!actual.meta || !actual.exports) {
                throw new Error(
                    `expected Stylable result {meta, exports}, but got: {${Object.keys(actual).join(
                        ', '
                    )}}`
                );
            }

            let scopeRule: postcss.Container | undefined = flag(this, 'actualRule');
            if (!scopeRule) {
                const { outputAst } = actual.meta;
                if (!outputAst) {
                    throw new Error(
                        `expected result to be transfromed - missing outputAst on meta`
                    );
                } else {
                    scopeRule = outputAst;
                }
            }

            if (Array.isArray(styleRules)) {
                scopeRule.walkRules((rule, index) => {
                    const nextExpectedRule = styleRules.shift();
                    const actualRule = rule.toString();
                    expect(actualRule, `rule #${index}`).to.equal(nextExpectedRule);
                });
            } else {
                const nodes = scopeRule.nodes;
                for (const expectedIndex in styleRules) {
                    expect(nodes, `rules exist`).to.not.equal(undefined);
                    expect(nodes && nodes[expectedIndex].toString()).to.equal(
                        styleRules[expectedIndex]
                    );
                }
            }
        }
    );
}
