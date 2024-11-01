import { ClassicPreset as Classic } from "rete";
import { DataflowNode } from "rete-engine";
import { socket } from "../sockets";

export class AddNode extends Classic.Node implements DataflowNode {
  width = 180;
  height = 195;

  constructor() {
    super("Add");

    this.addInput("a", new Classic.Input(socket, "Left"));
    this.addInput("b", new Classic.Input(socket, "Right"));
    this.addOutput("value", new Classic.Output(socket, "Number"));
    this.addControl(
      "result",
      new Classic.InputControl("number", { initial: 0 })
    );
  }
  data(inputs: { a?: number[]; b?: number[] }) {
    const { a = [], b = [] } = inputs;
    const sum = (a[0] || 0) + (b[0] || 0);

    (this.controls["result"] as Classic.InputControl<"number">).setValue(sum);

    return {
      value: sum
    };
  }
}
