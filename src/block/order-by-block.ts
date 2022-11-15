import { BaseBuilder } from '../base-builder';
import { Block } from './block';
import { Options } from '../types/options';
import { _isArray, _pad } from '../helpers';

type OrderByDirection = 'ASC' | 'DESC';

export interface OrderByMixin {
    /**
     * Add an ORDER BY clause.
     *
     * @param field Name of field to sort by.
     * @param direction Sort direction. `true` = ascending, `false` = descending, `null` = no direction set.
     *                  Default is `true`.
     * @param values List of parameter values specified as additional arguments. Default is `[]`.
     */
    order(field: string, direction?: boolean | null | OrderByDirection, ...values: any[]): this;
}

export class OrderByBlock extends Block implements OrderByMixin {
    _orders: {
        field: string | BaseBuilder;
        dir: OrderByDirection;
        values: any[];
    }[];

    constructor(options: Options) {
        super(options);

        this._orders = [];
    }

    /**
     * Add an ORDER BY transformation for the given field in the given order.
     *
     * To specify descending order pass false for the 'dir' parameter.
     */
    order(field: string | BaseBuilder, dir?: boolean | null | OrderByDirection, ...values) {
        field = this._sanitizeField(field);

        let direction: OrderByDirection = null;

        if (!(typeof dir === 'string')) {
            if (dir === undefined) {
                direction = 'ASC'; // Default to asc
            } else if (dir !== null) {
                direction = dir ? 'ASC' : 'DESC'; // Convert truthy to asc
            }
        } else {
            direction = dir;
        }

        this._orders.push({
            field,
            dir: direction,
            values: values,
        });

        return this;
    }

    _toParamString(options: Options = {}) {
        let totalStr = '';
        const totalValues = [];

        for (const { field, dir, values } of this._orders) {
            totalStr = _pad(totalStr, ', ');

            const ret = this._buildString(field.toString(), values, {
                buildParameterized: options.buildParameterized,
            });

            (totalStr += ret.text), _isArray(ret.values) && ret.values.forEach((value) => totalValues.push(value));

            if (dir !== null) {
                totalStr += ` ${dir}`;
            }
        }

        return {
            text: totalStr.length ? `ORDER BY ${totalStr}` : '',
            values: totalValues,
        };
    }
}
