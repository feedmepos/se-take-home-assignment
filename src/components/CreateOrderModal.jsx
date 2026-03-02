import { Modal, Select, Form } from "antd";
import { useState } from "react";
import { ECustomerType } from "../utils/enums";

export default function CreateOrderModal({ open, onClose, onCreate }) {
  const [customerType, setCustomerType] = useState(ECustomerType.NORMAL);

  const handleOk = () => {
    onCreate(customerType);
    onClose();
  };

  return (
    <Modal
      title="Create Order"
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText="Confirm"
      style={{ zIndex: 9999 }}
    >
      <Form layout="vertical">
        <Form.Item label="Customer Type">
          <Select
            value={customerType}
            onChange={setCustomerType}
            options={[
              { value: ECustomerType.NORMAL, label: "Normal" },
              { value: ECustomerType.VIP, label: "VIP" },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}