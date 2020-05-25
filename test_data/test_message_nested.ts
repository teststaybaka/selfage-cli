enum TestEnum {
  ONE = 1,
}

interface BasicData {
  data1: string;
}

interface BasicData2 {
  data2: string;
}

interface NestedData {
  basicData: BasicData;
  basicData2: BasicData2;
  testEnum: TestEnum;
}
