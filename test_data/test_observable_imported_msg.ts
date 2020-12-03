import { BasicData, Color } from "./test_observable_basic_msg";

// @Observable
interface ExtendedData extends BasicData {
  booleanField2: boolean;
}

// @Observable
interface NestedData {
  color: Color;
  basicData: BasicData;
}
