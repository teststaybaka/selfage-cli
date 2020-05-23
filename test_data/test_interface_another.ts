import { TestColor, TestObject, TestObject2 } from './test_interface';

export interface TestImportedFieldObject {
  importedField1: TestObject,
  color: TestColor,
  color2: TestColor,
}

export interface TestNestedFieldObject {
  nestedFiled?: TestImportedFieldObject,
}

export interface TestExtentedObject extends TestObject, TestObject2 {
  field5: boolean,
}

export interface TestFieldExtendedObject extends TestImportedFieldObject {
  importedField1: TestExtentedObject,
  otherField: number,
}

