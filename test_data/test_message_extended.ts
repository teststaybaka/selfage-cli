interface BasicData {
  data1: string;
}

interface BasicData2 {
  data2: string;
}

interface ExtendedData extends BasicData {
  extendedField: string;
}

interface ExtendedData2 extends BasicData, BasicData2 {
  extendedField: string;
}
