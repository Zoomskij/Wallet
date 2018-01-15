import * as React from 'react';
import Table from 'antd/es/table';
import DatePicker from 'antd/es/date-picker';
import Select from 'antd/es/select';
import Input from 'antd/es/input';
import * as cn from 'classnames';
import { inject, observer } from 'mobx-react';
import { HistoryStore } from '../../../stores/history';
import { MainStore } from '../../../stores/main';
import { ISendTransactionResult } from 'app/api';
import { ColumnProps } from 'antd/lib/table';
import * as moment from 'moment';
import * as debounce from 'lodash/fp/debounce';
import { AccountBigSelect } from 'app/components/common/account-big-select';
import { IdentIcon } from 'app/components/common/ident-icon';
import { Balance } from 'app/components/common/balance-view';
import { Hash } from 'app/components/common/hash-view';

const RangePicker = DatePicker.RangePicker;
const Option = Select.Option;

const debounce500 = debounce(500);

class TxTable extends Table<ISendTransactionResult> {}

interface IProps {
    className?: string;
    historyStore?: HistoryStore;
    mainStore?: MainStore;
    initialAddress?: string;
    initialCurrency?: string;
}

@inject('historyStore', 'mainStore')
@observer
export class History extends React.Component<IProps, any> {

    protected columns: Array<ColumnProps<ISendTransactionResult>> = [{
        className: 'sonm-tx-list__cell-time sonm-tx-list__cell',
        dataIndex: 'timestamp',
        title: 'Time',
        render: (time, record) => {
            const m = moment(time);

            return [
                <div key="1">{m.format('H:mm:ss')}</div>,
                <div key="2">{m.format('D MMM YY')}</div>,
            ];
        },
    }, {
        dataIndex: 'fromAddress',
        className: 'sonm-tx-list__cell-from sonm-tx-list__cell',
        title: 'From',
        render: (_, record) => {
            const addr = record.fromAddress;
            const account = this.props.mainStore && this.props.mainStore.accountMap.get(addr);
            const name = account
                ? account.name
                : addr;

            return [
                <div key="0" className="sonm-tx-list__cell-from-name">{name}</div>,
                <IdentIcon key="1" address={addr} width={20} className="sonm-tx-list__cell-from-icon" />,
                <Hash key="2" className="sonm-tx-list__cell-from-addr" hash={addr} hasCopyButton />,
            ];
        },
    }, {
        dataIndex: 'toAddress',
        className: 'sonm-tx-list__cell-to sonm-tx-list__cell',
        title: 'To',
        render: (_, record) => {
            const addr = record.toAddress;

            return [
                <IdentIcon key="0" address={addr} width={20} className="sonm-tx-list__cell-to-icon" />,
                <Hash key="1" hash={addr} hasCopyButton className="sonm-tx-list__cell-to-hash" />,
            ];
        },
    }, {
        dataIndex: 'amount',
        className: 'sonm-tx-list__cell-amount sonm-tx-list__cell',
        title: 'Amount / fee',
        render: (_, record) => {
            const addr = record.currencyAddress;
            const currency = this.props.mainStore && this.props.mainStore.currencyMap.get(addr);
            const symbol = currency
                ? currency.symbol
                : 'None';

            const result = [
                <Balance
                    className="sonm-tx-list__cell-amount-value"
                    key="0"
                    symbol={symbol}
                    balance={record.amount}
                />,
            ];

            if (record.fee) {
                result.push(
                    <Balance
                        key="1"
                        className="sonm-tx-list__cell-amount-fee"
                        balance={record.fee}
                        symbol="Ether"
                        decimals={6}
                    />,
                );
            }

            return <div className="sonm-tx-list__cell-amount-ct">{result}</div>;
        },
    }, {
        dataIndex: 'hash',
        title: 'TxHash',
        className: 'sonm-tx-list__cell-hash sonm-tx-list__cell',
        render: (_, record) => {
            return <Hash hash={record.hash} hasCopyButton />;
        },
    }, {
        dataIndex: 'status',
        title: 'Status',
        className: 'sonm-tx-list__cell-status sonm-tx-list__cell',
        render: (_, record) => {
            const cls = `sonm-tx-list__cell-status--${record.status}`;

            return (
                <div className={cn('sonm-tx-list__cell-status', cls)}>
                    {record.status}
                </div>
            );
        },
    }];

    public state = {
        query: '',
    };

    public componentWillMount() {
        if (!this.props.historyStore) { return; }

        let updated = false;

        if (this.props.initialAddress) {
            updated = this.props.historyStore.setFilterFrom(this.props.initialAddress);
        }

        if (this.props.initialCurrency) {
            updated = updated || this.props.historyStore.setFilterCurrency(this.props.initialCurrency);
        }

        if (!updated) { this.props.historyStore.update(); }
    }

    protected handleChangeTime = (dates: moment.Moment[]) => {
        this.props.historyStore && this.props.historyStore.setFilterTime(
            dates[0].valueOf(),
            dates[1].valueOf(),
        );
    }

    protected handlePageChange = (page: number) => {
        this.props.historyStore && this.props.historyStore.setPage(page);
    }

    protected handleChangeQuery = (event: any) => {
        const query = event.target.value;

        this.setState({query});
        this.setQueryDebonced(query);
    }

    protected setQueryDebonced = debounce500((query: string) => {
        this.props.historyStore && this.props.historyStore.setQuery(query);
    })

    protected handleSelectCurrency = (value: any) => {
        const address = value as string;

        this.props.historyStore && this.props.historyStore.setFilterCurrency(address);
    }

    public render() {
        if (this.props.mainStore === undefined || this.props.historyStore === undefined) {
            return null;
        }

        const {
            className,
        } = this.props;

        const pagination = {
            total: this.props.historyStore.total,
            defaultPageSize: this.props.historyStore.perPage,
            current: this.props.historyStore.page,
            onChange: this.handlePageChange,
        };

        return (
            <div className={cn('sonm-history', className)}>
                <AccountBigSelect
                    className="sonm-history__select-account"
                    returnPrimitive
                    onChange={this.props.historyStore.setFilterFrom}
                    accounts={this.props.mainStore.accountList}
                    value={this.props.historyStore.fromAddress}
                    hasEmptyOption
                />
                <RangePicker
                    allowClear={false}
                    className="sonm-history__date-range"
                    value={[
                        moment(this.props.historyStore.timeStart),
                        moment(this.props.historyStore.timeEnd),
                    ]}
                    onChange={this.handleChangeTime}
                />
                <Select
                    onChange={this.handleSelectCurrency}
                    value={this.props.historyStore.curencyAddress}
                    className="sonm-history__select-currency"
                >
                    {this.props.mainStore.currentBalanceList.map(
                        x => <Option
                            key={x.address}
                            value={x.address}
                            title={x.symbol}
                        >
                            {x.symbol}
                        </Option>,
                    )}
                    <Option value="" title="">
                        All coins
                    </Option>
                </Select>
                <Input
                    placeholder="Search by recipient address / TxHash"
                    onChange={this.handleChangeQuery}
                    className="sonm-history__query"
                    value={this.state.query}
                />

                <TxTable
                    className="sonm-history__table sonm-tx-list"
                    dataSource={this.props.historyStore.currentList}
                    columns={this.columns}
                    pagination={pagination}
                    rowKey="hash"
                />
            </div>
        );
    }
}
