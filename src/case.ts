import { BaseBuilder, DefaultQueryBuilderOptions } from './base-builder';
import { _extend, _pad, _isPlainObject } from './helpers';
import { Options } from './types/options';

/**
 * An SQL CASE expression builder.
 *
 * SQL cases are used to select proper values based on specific criteria.
 */
export class Case extends BaseBuilder {
    _fieldName: string;
    _cases: { expression?: string; values: any[]; result?: string }[];
    _elseValue: string;

    constructor(fieldName, options = {}) {
        super(options);

        if (_isPlainObject(fieldName)) {
            options = fieldName;

            fieldName = null;
        }

        if (fieldName) {
            this._fieldName = this._sanitizeField(fieldName);
        }

        this.options = _extend({}, DefaultQueryBuilderOptions, options);

        this._cases = [];
        this._elseValue = null;
    }

    when(expression, ...values) {
        this._cases.unshift({
            expression,
            values: values,
        });

        return this;
    }

    then(result) {
        if (this._cases.length === 0) {
            throw new Error('when() needs to be called first');
        }

        this._cases[0].result = result;

        return this;
    }

    else(elseValue) {
        this._elseValue = elseValue;

        return this;
    }

    _toParamString(options: Options = {}) {
        let totalStr = '';
        const totalValues = [];

        for (const { expression, values, result } of this._cases) {
            totalStr = _pad(totalStr, ' ');

            const ret = this._buildString(expression, values, {
                buildParameterized: options.buildParameterized,
                nested: true,
            });

            totalStr += `WHEN ${ret.text} THEN ${this._formatValueForQueryString(result)}`;
            ret.values.forEach((value) => totalValues.push(value));
        }

        if (totalStr.length) {
            totalStr += ` ELSE ${this._formatValueForQueryString(this._elseValue)} END`;

            if (this._fieldName) {
                totalStr = `${this._fieldName} ${totalStr}`;
            }

            totalStr = `CASE ${totalStr}`;
        } else {
            totalStr = this._formatValueForQueryString(this._elseValue);
        }

        return {
            text: totalStr,
            values: totalValues,
        };
    }
}
