import { BasicData, BASIC_DATA } from './test_message_basic';
import { DatastoreModelDescriptor } from 'selfage/be/datastore_model_descriptor';

export let BASIC_DATA_MODEL: DatastoreModelDescriptor<BasicData> = {
  name: "BasicData",
  key: "numberField",
  excludedIndexes: ["numberField","stringField","booleanField","numberArrayField","stringArrayField","booleanArrayField"],
  valueDescriptor: BASIC_DATA,
}
