export type CommonObject = Record<string, Record<string, string>>;

export const CommonSchema = {
  id: { type: String, required: true },
  is_deleted: { type: Boolean, required: true, default: false },
  created_info: { 
    id: { type: String, required: true },
    full_name: { type: String, required: true },
    at: { type: Date, required: true },
  },
  updated_info: { 
    id: { type: String, required: true },
    full_name: { type: String, required: true },
    at: { type: Date, required: true },
  }
}
