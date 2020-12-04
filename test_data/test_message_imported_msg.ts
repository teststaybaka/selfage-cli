import { BasicData, Color } from "./test_message_basic_msg";

export interface ExtendedData extends BasicData {
  extendedField: string;
}

export interface NestedData {
  basicData: BasicData;
  color: Color;
}
