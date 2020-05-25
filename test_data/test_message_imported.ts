import { BasicData, Color } from "./test_message_basic";

interface ExtendedData extends BasicData {
  extendedField: string;
}

interface NestedData {
  basicData: BasicData;
  color: Color;
}
