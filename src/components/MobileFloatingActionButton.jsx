import { useState } from "react";
import { Button, Grid } from "antd";
import { PlusOutlined, RobotOutlined, DeleteOutlined, CloseOutlined } from "@ant-design/icons";
import { COLORS, SPACING, BUTTON_SIZE, Z_INDEX } from "../utils/constants";

const { useBreakpoint } = Grid;

/**
 * Mobile-optimized floating action button for bot and order management
 */
export default function MobileFloatingActionButton({ onAddOrder, onAddBot, onRemoveBot }) {
  const screenSize = useBreakpoint();
  const [botMenuOpen, setBotMenuOpen] = useState(false);

  // Only show on mobile
  if (!screenSize.xs) return null;

  const containerStyle = {
    position: "fixed",
    bottom: SPACING.FAB_BOTTOM,
    right: SPACING.FAB_RIGHT,
    display: "flex",
    flexDirection: "column-reverse",
    alignItems: "flex-end",
    gap: SPACING.FAB_GAP,
    zIndex: Z_INDEX.FAB_MENU,
  };

  const removeButtonStyle = {
    backgroundColor: COLORS.BOT_REMOVE_BG,
    color: COLORS.BUTTON_TEXT,
    marginRight: SPACING.FAB_MENU_OFFSET,
    minWidth: SPACING.BUTTON_MIN_WIDTH,
  };

  const addButtonStyle = {
    backgroundColor: COLORS.BOT_ADD_BG,
    color: COLORS.BUTTON_TEXT,
    marginRight: SPACING.FAB_MENU_OFFSET,
    minWidth: SPACING.BUTTON_MIN_WIDTH,
  };

  const toggleButtonStyle = {
    backgroundColor: COLORS.BUTTON_PRIMARY,
    color: COLORS.BUTTON_TEXT,
    marginRight: botMenuOpen ? SPACING.FAB_MENU_OFFSET : 0,
  };

  return (
    <div style={containerStyle}>
      {/* Add Order (always visible) */}
      <Button
        type="primary"
        shape="circle"
        size={BUTTON_SIZE}
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
            size={BUTTON_SIZE}
            style={removeButtonStyle}
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
            size={BUTTON_SIZE}
            style={addButtonStyle}
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
        size={BUTTON_SIZE}
        icon={botMenuOpen ? <CloseOutlined /> : <RobotOutlined />}
        style={toggleButtonStyle}
        onClick={() => setBotMenuOpen(!botMenuOpen)}
      >
        {botMenuOpen ? "Close" : ""}
      </Button>
    </div>
  );
}
