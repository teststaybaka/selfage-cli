import { ExtendedData, NestedData } from "./test_message_imported_msg";

interface ExtendNestedData extends NestedData {
  basicData: ExtendedData;
}
