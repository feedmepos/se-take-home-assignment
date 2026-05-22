class order 
{
  constructor(id, type) 
  {
    this.id = id;           
    this.type = type;        
    this.status = "PENDING"; 
    this.createdAt = new Date();
    this.completedAt = null;
  }
}
module.exports = order;
