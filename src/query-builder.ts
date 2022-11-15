import { BaseBuilder } from './base-builder';
import { Block } from './block';
import { Options } from './types/options';
import { _extend } from './helpers';

/**
 * Query builder base class
 *
 * Note that the query builder does not check the final query string for correctness.
 *
 * All the build methods in this object return the object instance for chained method calling purposes.
 */
export class QueryBuilder extends BaseBuilder {
    blocks: Block[];

    /**
     * Constructor
     *
     * blocks - array of cls.BaseBuilderBlock instances to build the query with.
     */
    constructor(options: Options, blocks: Block[]) {
        super(options);

        this.blocks = blocks || [];

        // Copy exposed methods into myself
        for (const block of this.blocks) {
            const exposedMethods = block.exposedMethods();

            for (const methodName in exposedMethods) {
                const methodBody = exposedMethods[methodName];

                if (undefined !== this[methodName]) {
                    throw new Error(`Builder already has a builder method called: ${methodName}`);
                }

                ((block, name, body) => {
                    this[name] = (...args) => {
                        body.call(block, ...args);

                        return this;
                    };
                })(block, methodName, methodBody);
            }
        }
    }

    /**
     * Register a custom value handler for this query builder and all its contained blocks.
     *
     * Note: This will override any globally registered handler for this value type.
     */
    registerValueHandler(type, handler) {
        for (const block of this.blocks) {
            block.registerValueHandler(type, handler);
        }

        super.registerValueHandler(type, handler);

        return this;
    }

    /**
     * Update query builder options
     *
     * This will update the options for all blocks too. Use this method with caution as it allows you to change the
     * behaviour of your query builder mid-build.
     */
    updateOptions(options: Options) {
        this.options = _extend({}, this.options, options);

        for (const block of this.blocks) {
            block.options = _extend({}, block.options, options);
        }
    }

    // Get the final fully constructed query param obj.
    _toParamString(options: Options = {}) {
        options = _extend({}, this.options, options);

        const blockResults = this.blocks.map((b) =>
            b._toParamString({
                buildParameterized: options.buildParameterized,
                queryBuilder: this,
            })
        );

        const blockTexts = blockResults.map((b) => b.text);
        const blockValues = blockResults.map((b) => b.values);

        let totalStr = blockTexts.filter((v) => v.length > 0).join(options.separator);

        const totalValues = [];

        blockValues.forEach((block) => block.forEach((value) => totalValues.push(value)));

        if (!options.nested) {
            if (options.numberedParameters) {
                let i = undefined === options.numberedParametersStartAt ? 1 : options.numberedParametersStartAt;

                // construct regex for searching
                const regex = options.parameterCharacter.replace(/[-[\]{}()*+?.,\\^$|*\s]/g, '\\$&');

                totalStr = totalStr.replace(new RegExp(regex, 'g'), () => `${options.numberedParametersPrefix}${i++}`);
            }
        }

        return {
            text: this._applyNestingFormatting(totalStr, !!options.nested),
            values: totalValues,
        };
    }

    // Deep clone
    clone() {
        const blockClones = this.blocks.map((v) => v.clone());

        return new (this.constructor as any)(this.options, blockClones);
    }

    // Get a specific block
    getBlock(blockType) {
        const filtered = this.blocks.filter((b) => b instanceof blockType);

        return filtered[0];
    }
}
