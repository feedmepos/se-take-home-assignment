import { Modal, Select, Form } from "antd";
import { useState } from "react";
import { CUSTOMER_TYPES } from "../utils/enums";
import { Z_INDEX } from "../utils/constants";

/**
 * Modal for creating new orders
 */
export default function CreateOrderModal({ open, onClose, onCreate }) {
  const [customerType, setCustomerType] = useState(CUSTOMER_TYPES.NORMAL);

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
      style={{ zIndex: Z_INDEX.MODAL }}
    >
      <Form layout="vertical">
        <Form.Item label="Customer Type">
          <Select
            value={customerType}
            onChange={setCustomerType}
            options={[
              { value: CUSTOMER_TYPES.NORMAL, label: "Normal" },
              { value: CUSTOMER_TYPES.VIP, label: "VIP" },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}