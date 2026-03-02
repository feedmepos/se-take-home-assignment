import { useState } from "react";
import { Button, Grid, Tooltip } from "antd";
import { PlusOutlined, RobotOutlined, DeleteOutlined, CloseOutlined } from "@ant-design/icons";

const { useBreakpoint } = Grid;

export default function MobileFloatingActionButton({ onAddOrder, onAddBot, onRemoveBot }) {
  const screenSize = useBreakpoint();
  const [botMenuOpen, setBotMenuOpen] = useState(false);

  // Only show on mobile
  if (!screenSize.xs) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 16, 
        display: "flex",
        flexDirection: "column-reverse", 
        alignItems: "flex-end",
        gap: 12,
        zIndex: 999,
      }}
    >
      {/* Add Order (always visible) */}
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={<PlusOutlined />}
          onClick={onAddOrder}
        />

      {/* Bot Menu (expandable) */}
      {botMenuOpen && (
        <>
          <Button
            key="remove-bot"
            type="default"
            icon={<DeleteOutlined />}
                    size="large"

            style={{
              backgroundColor: "#f44336",
              color: "#fff",
              marginRight: 32, // aligned to right
              minWidth: 100
            }}
            onClick={() => {
              onRemoveBot();
              setBotMenuOpen(false);
            }}
          >
            Remove Bot
          </Button>
          <Button
            key="add-bot"
            type="default"
            icon={<RobotOutlined />}
                    size="large"

            style={{
              backgroundColor: "#4caf50",
              color: "#fff",
              marginRight: 32, // aligned to right
              minWidth: 100
            }}
            onClick={() => {
              onAddBot();
              setBotMenuOpen(false);
            }}
          >
            Add Bot
          </Button>
        </>
      )}

      {/* Main Bot Button (toggle menu) */}
      <Button
        type="default"
        shape="default"
        size="large"
        icon={botMenuOpen ? <CloseOutlined /> : <RobotOutlined />}
        style={{ backgroundColor: "#4096ff", color: "#fff", marginRight: botMenuOpen ? 32 : 0 }}
        onClick={() => setBotMenuOpen(!botMenuOpen)}
      >{botMenuOpen ? "Close" : ""}</Button>
    </div>
  );
}