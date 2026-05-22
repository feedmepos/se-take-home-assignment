exports.time = () => 
{
    const d = new Date();
    return d.toTimeString().split(" ")[0];
};
