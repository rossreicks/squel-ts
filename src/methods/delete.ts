import { QueryBuilder } from '../query-builder';
import {
    StringBlock,
    TargetTableBlock,
    FromTableBlock,
    JoinBlock,
    WhereBlock,
    OrderByBlock,
    LimitBlock,
    FromTableMixin,
    JoinMixin,
    LimitMixin,
    OrderByMixin,
    TargetTableMixin,
    WhereMixin,
} from '../block';
import { _extend } from '../helpers';

export interface Delete
    extends QueryBuilder,
        TargetTableMixin,
        FromTableMixin,
        JoinMixin,
        WhereMixin,
        OrderByMixin,
        LimitMixin {}

export class Delete extends QueryBuilder {
    constructor(options, blocks = null) {
        blocks = blocks || [
            new StringBlock(options, 'DELETE'),
            new TargetTableBlock(options),
            new FromTableBlock(
                _extend({}, options, {
                    singleTable: true,
                })
            ),
            new JoinBlock(options),
            new WhereBlock(options),
            new OrderByBlock(options),
            new LimitBlock(options),
        ];

        super(options, blocks);
    }
}
