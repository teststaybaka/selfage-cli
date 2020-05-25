import { ExtendedData, NestedData } from "./test_message_imported";

interface ExtendNestedData extends NestedData {
  basicData: ExtendedData;
}
