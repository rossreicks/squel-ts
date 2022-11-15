import { Block } from './block';
import { QueryBuilder } from '../query-builder';
import { Options } from '../types/options';
import { isSquelBuilder, _pad } from '../helpers';

type UnionType = 'UNION' | 'UNION ALL';

export interface UnionMixin {
    /**
     * Combine with another `SELECT` using `UNION`.
     *
     * @param query Another `SELECT` query to combine this query with.
     */
    union(query: QueryBuilder, unionType?: UnionType): this;

    /**
     * Combine with another `SELECT` using `UNION ALL`.
     *
     * @param query Another `SELECT` query to combine this query with.
     */
    union_all(query: QueryBuilder): this;
}

export class UnionBlock extends Block implements UnionMixin {
    _unions: { table: string | QueryBuilder; type: UnionType }[];

    constructor(options: Options) {
        super(options);

        this._unions = [];
    }

    union(table: string | QueryBuilder, type: UnionType = 'UNION') {
        table = this._sanitizeTable(table) as string | QueryBuilder;

        this._unions.push({
            type,
            table,
        });

        return this;
    }

    union_all(table: string | QueryBuilder) {
        this.union(table, 'UNION ALL');

        return this;
    }

    _toParamString(options: Options = {}) {
        let totalStr = '';
        const totalValues = [];

        for (const { type, table } of this._unions) {
            totalStr = _pad(totalStr, this.options.separator);

            let tableStr;

            if (isSquelBuilder(table)) {
                const ret = (table as QueryBuilder)._toParamString({
                    buildParameterized: options.buildParameterized,
                    nested: true,
                });

                tableStr = ret.text;
                ret.values.forEach((value) => totalValues.push(value));
            } else {
                tableStr = this._formatTableName(table as string);
            }

            totalStr += `${type} ${tableStr}`;
        }

        return {
            text: totalStr,
            values: totalValues,
        };
    }
}
