import "./style.css";
import { createEventStore } from "./storage/event-store/index.ts";
import { createApp } from "./app.ts";

async function main(): Promise<void> {
  // 1. DOM取得
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const container = document.getElementById("app") as HTMLDivElement;

  // 2. ストレージ初期化
  const eventStore = await createEventStore();

  // 3. 既存Node・Edge読み込み
  const records = await eventStore.getAllNodes();
  const edges = await eventStore.getAllEdges();

  // 4. アプリ生成・起動
  const app = createApp({ canvas, container, eventStore, initialRecords: records, initialEdges: edges });
  app.start();

  // 5. リサイズ対応
  window.addEventListener("resize", () => app.resize());
}

main().catch(console.error);
