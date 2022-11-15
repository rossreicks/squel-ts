import { _pad } from '../helpers';
import { Options } from '../types/options';
import { AbstractSetFieldBlock } from './abstract-set-field-block';

interface OnDupUpdateOptions {
    /**
     * When `autoQuoteFieldNames` is turned on this flag instructs it to ignore the period (.) character within field
     * names. Default is `false`.
     */
    ignorePeriodsForFieldNameQuotes: boolean;

    /**
     * If set and the value is a String then it will not be quoted in the output Default is `false`.
     */
    dontQuote: boolean;
}

export interface OnDuplicateKeyUpdateMixin {
    /**
     * Add an OFFSET clause.
     *
     * @param limit Index of record to start fetching from.
     */
    onDupUpdate(name: string, value: any, options?: OnDupUpdateOptions): this;
}

export class OnDuplicateKeyUpdateBlock extends AbstractSetFieldBlock implements OnDuplicateKeyUpdateMixin {
    onDupUpdate(field, value, options) {
        this._set(field, value, options);

        return this;
    }

    _toParamString(options: Options = {}) {
        let totalStr = '';
        const totalValues = [];

        for (let i = 0; i < this._fields.length; ++i) {
            totalStr = _pad(totalStr, ', ');

            const field = this._fields[i];

            const value = this._values[0][i];

            const valueOptions = this._valueOptions[0][i];

            // e.g. if field is an expression such as: count = count + 1
            if (typeof value === 'undefined') {
                totalStr += field;
            } else {
                const ret = this._buildString(`${field} = ${this.options.parameterCharacter}`, [value], {
                    buildParameterized: options.buildParameterized,
                    formattingOptions: valueOptions,
                });

                totalStr += ret.text;
                ret.values.forEach((value) => totalValues.push(value));
            }
        }

        return {
            text: !totalStr.length ? '' : `ON DUPLICATE KEY UPDATE ${totalStr}`,
            values: totalValues,
        };
    }
}
