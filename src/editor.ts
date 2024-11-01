import { createRoot } from "react-dom/client";
import { NodeEditor, GetSchemes, ClassicPreset as Classic } from "rete";
import { AreaExtensions } from "rete-area-plugin";
import { Area3D, Area3DPlugin, Area3DExtensions } from "rete-area-3d-plugin";
import {
  ConnectionPlugin,
  Presets as ConnectionPresets
} from "rete-connection-plugin";
import { ReactPlugin, Presets, ReactArea2D } from "rete-react-plugin";
import { DataflowEngine } from "rete-engine";
import {
  ContextMenuPlugin,
  ContextMenuExtra,
  Presets as ContextMenuPresets
} from "rete-context-menu-plugin";
import { setup3DEnvironment } from "./ocean";
import { NumberNode } from "./nodes/number";
import { AddNode } from "./nodes/add";

type Node = NumberNode | AddNode;
type Conn =
  | Connection<NumberNode, AddNode>
  | Connection<AddNode, AddNode>
  | Connection<AddNode, NumberNode>;
type Schemes = GetSchemes<Node, Conn>;

class Connection<A extends Node, B extends Node> extends Classic.Connection<
  A,
  B
> {}

type AreaExtra = Area3D<Schemes> | ReactArea2D<Schemes> | ContextMenuExtra;

export async function createEditor(container: HTMLElement) {
  const editor = new NodeEditor<Schemes>();

  const area = new Area3DPlugin<Schemes, AreaExtra>(container);
  const connection = new ConnectionPlugin<Schemes, AreaExtra>();
  const render = new ReactPlugin<Schemes, AreaExtra>({ createRoot });
  const contextMenu = new ContextMenuPlugin<Schemes>({
    items: ContextMenuPresets.classic.setup([
      ["Number", () => new NumberNode(1, process)],
      ["Add", () => new AddNode()]
    ])
  });
  area.use(contextMenu);

  AreaExtensions.selectableNodes(area, AreaExtensions.selector(), {
    accumulating: AreaExtensions.accumulateOnCtrl()
  });

  render.addPreset(Presets.classic.setup());
  render.addPreset(Presets.contextMenu.setup());

  connection.addPreset(ConnectionPresets.classic.setup());

  editor.use(area);
  area.use(connection);
  area.use(render);

  Area3DExtensions.forms.node(area);
  Area3DExtensions.forms.connection(render);

  AreaExtensions.simpleNodesOrder(area);

  const dataflow = new DataflowEngine<Schemes>();

  editor.use(dataflow);

  async function process() {
    dataflow.reset();

    editor
      .getNodes()
      .filter((node) => node instanceof AddNode)
      .forEach(async (node) => {
        await dataflow.fetch(node.id);

        area.update(
          "control",
          (node.controls["result"] as Classic.InputControl<"number">).id
        );
      });
  }

  const a = new NumberNode(1, process);
  const b = new NumberNode(1, process);
  const add = new AddNode();

  await editor.addNode(a);
  await editor.addNode(b);
  await editor.addNode(add);

  await editor.addConnection(new Connection(a, "value", add, "a"));
  await editor.addConnection(new Connection(b, "value", add, "b"));

  const offset = -550;
  const apos = { x: 80, y: 200 + offset };
  const bpos = { x: 80, y: 400 + offset };
  const addpos = { x: 420, y: 240 + offset };

  await area.translate(a.id, apos);
  await area.translate(b.id, bpos);
  await area.translate(add.id, addpos);

  editor.addPipe((context) => {
    if (
      context.type === "connectioncreated" ||
      context.type === "connectionremoved"
    ) {
      process();
    }
    return context;
  });

  process();

  const { scene } = area.area;

  scene.camera.far = 50000;
  scene.camera.updateProjectionMatrix();

  const { water } = setup3DEnvironment(
    scene.renderer.webgl,
    scene.camera,
    scene.root
  );

  Area3DExtensions.lookAt(area, editor.getNodes());

  Area3DExtensions.animate(area, (time) => {
    water.material.uniforms["time"].value = time * 0.002;
  });

  return {
    destroy: () => area.destroy()
  };
}
