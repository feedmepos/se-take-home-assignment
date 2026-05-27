"use client";

import { FloatButton, Image } from "antd";
import { CloseOutlined, PlusOutlined } from "@ant-design/icons";

import IMAGES from "@/assets";

interface HomeFloatActionsProps {
  onAddNormalOrder: () => void;
  onAddVIPOrder: () => void;
  onAddBot: () => void;
  onRemoveBot: () => void;
}

const HomeFloatActions = ({
  onAddNormalOrder,
  onAddVIPOrder,
  onAddBot,
  onRemoveBot,
}: HomeFloatActionsProps) => {
  return (
    <FloatButton.Group
      trigger="click"
      style={{
        right: 24,
        bottom: 24,
      }}
      closeIcon={<CloseOutlined />}
      icon={<PlusOutlined />}
      className="home__float-actions"
    >
      <FloatButton
        icon={<Image src={IMAGES.normal_order_icon} preview={false} />}
        tooltip={{
          title: "New Normal Order",
          placement: "left",
        }}
        onClick={onAddNormalOrder}
      />
      <FloatButton
        icon={<Image src={IMAGES.vip_order_icon} preview={false} />}
        tooltip={{
          title: "New VIP Order",
          placement: "left",
        }}
        onClick={onAddVIPOrder}
      />
      <FloatButton
        icon={<Image src={IMAGES.add_bot_icon} preview={false} />}
        tooltip={{
          title: "Add Bot",
          placement: "left",
        }}
        onClick={onAddBot}
      />
      <FloatButton
        icon={<Image src={IMAGES.remove_bot_icon} preview={false} />}
        tooltip={{
          title: "Remove Bot",
          placement: "left",
        }}
        onClick={onRemoveBot}
      />
    </FloatButton.Group>
  );
};

export default HomeFloatActions;