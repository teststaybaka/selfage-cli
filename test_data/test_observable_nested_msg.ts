enum Color {
  RED = 1,
}

// @Observable
interface BasicData {
  data1: string;
}

// @Observable
interface NestedData {
  color: Color;
  basicData: BasicData;
  datas: BasicData[];
}
