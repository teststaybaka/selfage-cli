import { MessageDescriptor, PrimitiveType } from 'selfage/message_descriptor';
import { DatastoreQuery, DatastoreFilter, DatastoreOrdering, Operator, DatastoreModelDescriptor } from 'selfage/be/datastore_model_descriptor';

export interface BasicData {
  stringField?: string,
  numberField?: number,
  booleanField?: boolean,
  booleanArrayField?: Array<boolean>,
}

export let BASIC_DATA: MessageDescriptor<BasicData> = {
  name: 'BasicData',
  factoryFn: () => {
    return new Object();
  },
  fields: [
    {
      name: 'stringField',
      primitiveType: PrimitiveType.STRING,
    },
    {
      name: 'numberField',
      primitiveType: PrimitiveType.NUMBER,
    },
    {
      name: 'booleanField',
      primitiveType: PrimitiveType.BOOLEAN,
    },
    {
      name: 'booleanArrayField',
      primitiveType: PrimitiveType.BOOLEAN,
      arrayFactoryFn: () => {
        return new Array<any>();
      },
    },
  ]
};

export class NumberBooleanQueryBuilder {
  private datastoreQuery: DatastoreQuery<BasicData>;

  public constructor() {
    let filters = new Array<DatastoreFilter>();
    let orderings = new Array<DatastoreOrdering>();
    orderings.push({
      indexName: "numberField",
      descending: false
    });
    this.datastoreQuery = {filters: filters, orderings: orderings};
  }
  public start(token: string): this {
    this.datastoreQuery.startToken = token;
    return this;
  }
  public limit(num: number): this {
    this.datastoreQuery.limit = num;
    return this;
  }
  public filterByNumberField(operator: Operator, value: number): this {
    this.datastoreQuery.filters.push({
      indexName: "numberField",
      indexValue: value,
      operator: operator,
    });
    return this;
  }
  public filterByBooleanArrayField(operator: Operator, value: boolean): this {
    this.datastoreQuery.filters.push({
      indexName: "booleanArrayField",
      indexValue: value,
      operator: operator,
    });
    return this;
  }
  public build(): DatastoreQuery<BasicData> {
    return this.datastoreQuery;
  }
}

export class NumberQueryBuilder {
  private datastoreQuery: DatastoreQuery<BasicData>;

  public constructor() {
    let filters = new Array<DatastoreFilter>();
    let orderings = new Array<DatastoreOrdering>();
    orderings.push({
      indexName: "numberField",
      descending: true
    });
    this.datastoreQuery = {filters: filters, orderings: orderings};
  }
  public start(token: string): this {
    this.datastoreQuery.startToken = token;
    return this;
  }
  public limit(num: number): this {
    this.datastoreQuery.limit = num;
    return this;
  }
  public filterByNumberField(operator: Operator, value: number): this {
    this.datastoreQuery.filters.push({
      indexName: "numberField",
      indexValue: value,
      operator: operator,
    });
    return this;
  }
  public build(): DatastoreQuery<BasicData> {
    return this.datastoreQuery;
  }
}

/* Comment1 */
export let BASIC_DATA_MODEL: DatastoreModelDescriptor<BasicData> = {
  name: "BasicData",
  key: "stringField",
  excludedIndexes: ["stringField","booleanField"],
  valueDescriptor: BASIC_DATA,
}
