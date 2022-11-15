import { Options } from '../types/options';
import { Block } from './block';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace MssqlLimitOffsetTopBlock {
    export interface ParentBlock extends Block {
        _parent: LimitOffsetTopBlock;
    }

    export interface LimitBlock extends ParentBlock {
        limit(max: number): void;
    }

    export interface LimitMixin {
        /**
         * Add a LIMIT clause.
         *
         * @param limit Number of records to limit the query to.
         */
        limit(limit: number): this;
    }

    export interface TopBlock extends ParentBlock {
        top(max: number): void;
    }

    export interface TopMixin {
        /**
         * Insert the `TOP` keyword to limit the number of rows returned.
         *
         * @param num Number of rows or percentage of rows to limit to
         */
        top(num: number): this;
    }

    export interface OffsetBlock extends ParentBlock {
        offset(start: number): void;
    }

    export interface OffsetMixin {
        /**
         * Add an OFFSET clause.
         *
         * @param limit Index of record to start fetching from.
         */
        offset(limit: number): this;
    }
}

export interface LimitOffsetTopBlock extends Block {
    _limits: null | number;
    _offsets: null | number;

    ParentBlock: { new (parent: Block): MssqlLimitOffsetTopBlock.ParentBlock };
    LimitBlock: { new (parent: Block): MssqlLimitOffsetTopBlock.LimitBlock };
    TopBlock: { new (parent: Block): MssqlLimitOffsetTopBlock.TopBlock };
    OffsetBlock: { new (parent: Block): MssqlLimitOffsetTopBlock.OffsetBlock };

    LIMIT(): MssqlLimitOffsetTopBlock.LimitBlock;

    TOP(): MssqlLimitOffsetTopBlock.TopBlock;

    OFFSET(): MssqlLimitOffsetTopBlock.OffsetBlock;
}

export class LimitOffsetTopBlock extends Block {
    _limits: null | number;
    _offsets: null | number;

    constructor(options: Options) {
        super(options);
        this._limits = null;
        this._offsets = null;

        // This is setup as one block to return many as they all have to use each others data at different times
        // The build String of EITHER LIMIT OR TOP should execute, never both.

        /**
         * Set the LIMIT/TOP transformation.
         *
         * Call this will override the previously set limit for this query. Also note that Passing 0 for 'max' will remove
         * the limit.
         */
        const _limit = function (max) {
            max = this._sanitizeLimitOffset(max);
            this._parent._limits = max;
        };

        this.ParentBlock = class extends Block {
            _parent: LimitOffsetTopBlock;

            constructor(parent: LimitOffsetTopBlock) {
                super(parent.options);
                this._parent = parent;
            }

            /* c8 ignore next 3 */
            _toParamString(options: Options): { text: string; values: any[] } {
                throw new Error('Not implemented');
            }
        };

        this.LimitBlock = class extends this.ParentBlock {
            limit: typeof _limit;

            constructor(parent) {
                super(parent);
                this.limit = _limit;
            }

            _toParamString() {
                let str = '';

                if (this._parent._limits && this._parent._offsets) {
                    str = `FETCH NEXT ${this._parent._limits} ROWS ONLY`;
                }

                return {
                    text: str,
                    values: [],
                };
            }
        };

        this.TopBlock = class extends this.ParentBlock {
            top: typeof _limit;

            constructor(parent) {
                super(parent);
                this.top = _limit;
            }
            _toParamString() {
                let str = '';

                if (this._parent._limits && !this._parent._offsets) {
                    str = `TOP (${this._parent._limits})`;
                }

                return {
                    text: str,
                    values: [],
                };
            }
        };

        this.OffsetBlock = class extends this.ParentBlock {
            offset(start) {
                this._parent._offsets = this._sanitizeLimitOffset(start);
            }

            _toParamString() {
                let str = '';

                if (this._parent._offsets) {
                    str = `OFFSET ${this._parent._offsets} ROWS`;
                }

                return {
                    text: str,
                    values: [],
                };
            }
        };
    }

    LIMIT() {
        return new this.LimitBlock(this);
    }

    TOP() {
        return new this.TopBlock(this);
    }

    OFFSET() {
        return new this.OffsetBlock(this);
    }

    /* c8 ignore next 3 */
    _toParamString(options: Options): { text: string; values: any[] } {
        throw new Error('Not implemented');
    }
}
