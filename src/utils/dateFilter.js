export const getDateFilter = (time) => {
  const now = new Date();
  let startDate = null;

  switch (time) {
    case "24hours":
      startDate = new Date(now);
      startDate.setHours(startDate.getHours() - 24);
      break;

    case "7days":
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      break;

    case "30days":
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
      break;

    case "year":
      startDate = new Date(now);
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;

    case "all":
    default:
      return {};
  }

  return { createdAt: { $gte: startDate } };
};
