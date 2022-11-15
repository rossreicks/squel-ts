/* eslint-disable no-param-reassign */
import { BaseBuilder } from '../base-builder';
import { Block } from './block';
import { isSquelBuilder } from '../helpers';
import { Options } from '../types/options';

export abstract class AbstractConditionBlock extends Block {
    private _conditions: { expr: string | BaseBuilder; values: any[] }[];

    /**
     * @param {String} options.verb The condition verb.
     */
    constructor(options) {
        super(options);

        this._conditions = [];
    }

    /**
     * Add a condition.
     *
     * When the final query is constructed all the conditions are combined using the intersection (AND) operator.
     *
     * Concrete subclasses should provide a method which calls this
     */
    _condition(condition: string | BaseBuilder, ...values) {
        condition = this._sanitizeExpression(condition);

        this._conditions.push({
            expr: condition,
            values: values,
        });
    }

    _toParamString(options: Options = {}) {
        const totalStr = [];
        const totalValues = [];

        for (const { expr, values } of this._conditions) {
            const ret = isSquelBuilder(expr)
                ? (expr as BaseBuilder)._toParamString({
                      buildParameterized: options.buildParameterized,
                  })
                : this._buildString(expr as string, values, {
                      buildParameterized: options.buildParameterized,
                  });

            if (ret.text.length) {
                totalStr.push(ret.text);
            }

            ret.values.forEach((value) => totalValues.push(value));
        }

        let joinedString = '';

        if (totalStr.length) {
            joinedString = totalStr.join(') AND (');
        }

        return {
            text: joinedString.length ? `${this.options.verb} (${joinedString})` : '',
            values: totalValues,
        };
    }
}
