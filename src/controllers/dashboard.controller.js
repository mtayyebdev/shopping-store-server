import { APIError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/trycatch.js";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";

// get last seven months for charts...
const getLastSevenMonths = () => {
  const months = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    let date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
    );

    months.push({
      label: date.toLocaleString("default", { month: "long", year: "numeric" }),
      startDate: new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
      ),
      endDate: new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1),
      ),
    });
  }

  return months;
};

// geting today, yesterday, this week, this year, this month base on filter for chart data..
const getFilteredTime = (filter) => {
  const now = new Date();
  let startDate;
  let endDate;

  switch (filter) {
    case "today": {
      startDate = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          0,
          0,
          0,
          0,
        ),
      );
      endDate = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          23,
          59,
          59,
          999,
        ),
      );
      break;
    }
    case "yesterday": {
      const yesterday = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1),
      );
      startDate = new Date(
        Date.UTC(
          yesterday.getUTCFullYear(),
          yesterday.getUTCMonth(),
          yesterday.getUTCDate(),
          0,
          0,
          0,
          0,
        ),
      );
      endDate = new Date(
        Date.UTC(
          yesterday.getUTCFullYear(),
          yesterday.getUTCMonth(),
          yesterday.getUTCDate(),
          23,
          59,
          59,
          999,
        ),
      );
      break;
    }
    case "this_week":
      startDate = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() - 7,
          0,
          0,
          0,
          0,
        ),
      );

      endDate = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          23,
          59,
          59,
          999,
        ),
      );
      break;
    case "this_month":
      startDate = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
      );

      endDate = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0),
      );
      break;
    case "this_year":
      startDate = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1, 0, 0, 0, 0));
      break;
    default:
      break;
  }

  return { startDate, endDate };
};

// admin controllers....................
// total summary: sales, income, orders paid, visitors with charts data.....
const totalSummaryAdminController = asyncHandler(async (req, res) => {
  const months = getLastSevenMonths();
  const startDate = months[0].startDate;
  const endDate = months[months.length - 1].endDate;

  const date = new Date();
  const currentMonth = {
    start: new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1)),
  };

  const prevMonth = {
    start: new Date(date.getFullYear(), date.getMonth() - 1, 1),
    end: new Date(date.getFullYear(), date.getMonth(), 1),
  };

  const [salesData, incomeData, ordersPaidData] = await Promise.all([
    // total sales data.....
    await Order.aggregate([
      {
        $match: {
          actionStatus: "active",
        },
      },
      {
        $facet: {
          totalSales: [
            {
              $count: "count",
            },
          ],
          salesDataPerMonth: [
            {
              $match: {
                createdAt: {
                  $gte: startDate,
                  $lt: endDate,
                },
              },
            },
            {
              $group: {
                _id: {
                  year: { $year: "$createdAt" },
                  month: { $month: "$createdAt" },
                },
                total: { $sum: 1 },
              },
            },
          ],
          prevMonthSales: [
            {
              $match: {
                createdAt: {
                  $gte: prevMonth.start,
                  $lt: prevMonth.end,
                },
              },
            },
            {
              $count: "count",
            },
          ],
          currentMonthSales: [
            {
              $match: {
                createdAt: {
                  $gte: currentMonth.start,
                },
              },
            },
            {
              $count: "count",
            },
          ],
        },
      },
      {
        $project: {
          totalSales: {
            $ifNull: [{ $arrayElemAt: ["$totalSales.count", 0] }, 0],
          },
          salesDataPerMonth: 1,
          prevMonthSales: {
            $ifNull: [{ $arrayElemAt: ["$prevMonthSales.count", 0] }, 0],
          },
          currentMonthSales: {
            $ifNull: [{ $arrayElemAt: ["$currentMonthSales.count", 0] }, 0],
          },
        },
      },
      {
        $project: {
          totalSales: 1,
          salesDataPerMonth: 1,
          percentage: {
            $round: [
              {
                $multiply: [
                  {
                    $divide: [
                      {
                        $subtract: ["$currentMonthSales", "$prevMonthSales"],
                      },
                      "$prevMonthSales",
                    ],
                  },
                  100,
                ],
              },
              2,
            ],
          },
        },
      },
    ]),

    // total income data.....
    await Order.aggregate([
      {
        $match: {
          actionStatus: "active",
          paymentStatus: "paid",
          orderStatus: "delivered",
        },
      },
      {
        $facet: {
          totalIncome: [
            {
              $group: {
                _id: null,
                sum: { $sum: "$totalPrice" },
              },
            },
          ],
          incomeDataPerMonth: [
            {
              $match: {
                createdAt: {
                  $gte: startDate,
                  $lt: endDate,
                },
              },
            },
            {
              $group: {
                _id: {
                  year: { $year: "$createdAt" },
                  month: { $month: "$createdAt" },
                },
                total: {
                  $sum: "$totalPrice",
                },
              },
            },
          ],
          prevMonthIncome: [
            {
              $match: {
                createdAt: {
                  $gte: prevMonth.start,
                  $lt: prevMonth.end,
                },
              },
            },
            {
              $group: {
                _id: null,
                sum: {
                  $sum: "$totalPrice",
                },
              },
            },
          ],
          currentMonthIncome: [
            {
              $match: {
                createdAt: {
                  $gte: currentMonth.start,
                },
              },
            },
            {
              $group: {
                _id: null,
                sum: {
                  $sum: "$totalPrice",
                },
              },
            },
          ],
        },
      },
      {
        $project: {
          totalIncome: {
            $ifNull: [{ $arrayElemAt: ["$totalIncome.sum", 0] }, 0],
          },
          incomeDataPerMonth: 1,
          prevMonthIncome: {
            $ifNull: [{ $arrayElemAt: ["$prevMonthIncome.sum", 0] }, 0],
          },
          currentMonthIncome: {
            $ifNull: [{ $arrayElemAt: ["$currentMonthIncome.sum", 0] }, 0],
          },
        },
      },
      {
        $project: {
          totalIncome: 1,
          incomeDataPerMonth: 1,
          percentage: {
            $round: [
              {
                $multiply: [
                  {
                    $divide: [
                      {
                        $subtract: ["$currentMonthIncome", "$prevMonthIncome"],
                      },
                      "$prevMonthIncome",
                    ],
                  },
                  100,
                ],
              },
              2,
            ],
          },
        },
      },
    ]),

    // orders paid data....
    await Order.aggregate([
      {
        $match: {
          actionStatus: "active",
          paymentStatus: "paid",
        },
      },
      {
        $facet: {
          totalOrdersPaid: [
            {
              $count: "count",
            },
          ],
          ordersPaidPerMonth: [
            {
              $match: {
                createdAt: {
                  $gte: startDate,
                  $lt: endDate,
                },
              },
            },
            {
              $group: {
                _id: {
                  year: { $year: "$createdAt" },
                  month: { $month: "$createdAt" },
                },
                total: {
                  $sum: 1,
                },
              },
            },
          ],
          prevMonthOrdersPaid: [
            {
              $match: {
                createdAt: {
                  $gte: prevMonth.start,
                  $lt: prevMonth.end,
                },
              },
            },
            {
              $count: "count",
            },
          ],
          currentMonthOrdersPaid: [
            {
              $match: {
                createdAt: {
                  $gte: currentMonth.start,
                },
              },
            },
            {
              $count: "count",
            },
          ],
        },
      },
      {
        $project: {
          totalOrdersPaid: {
            $ifNull: [{ $arrayElemAt: ["$totalOrdersPaid.count", 0] }, 0],
          },
          ordersPaidPerMonth: 1,
          prevMonthOrdersPaid: {
            $ifNull: [{ $arrayElemAt: ["$prevMonthOrdersPaid.count", 0] }, 0],
          },
          currentMonthOrdersPaid: {
            $ifNull: [
              { $arrayElemAt: ["$currentMonthOrdersPaid.count", 0] },
              0,
            ],
          },
        },
      },
      {
        $project: {
          totalOrdersPaid: 1,
          ordersPaidPerMonth: 1,
          percentage: {
            $round: [
              {
                $multiply: [
                  {
                    $divide: [
                      {
                        $subtract: [
                          "$currentMonthOrdersPaid",
                          "$prevMonthOrdersPaid",
                        ],
                      },
                      "$prevMonthOrdersPaid",
                    ],
                  },
                  100,
                ],
              },
              2,
            ],
          },
        },
      },
    ]),
  ]);

  return res.status(200).json({
    success: true,
    message: "Dashboard summary found",
    salesData: salesData[0],
    incomeData: incomeData[0],
    ordersPaidData: ordersPaidData[0],
  });
});

// earning revenue with chart data..........
const earningRevenueAdminController = asyncHandler(async (req, res) => {
  const { filter } = req.query;
  if (!filter) {
    throw new APIError("Date filter not found", 404);
  }

  const normalizedFilters = {
    today: "today",
    yesterday: "yesterday",
    thisWeek: "this_week",
    thisMonth: "this_month",
    thisYear: "this_year",
    this_week: "this_week",
    this_month: "this_month",
    this_year: "this_year",
  };

  const resolvedFilter = normalizedFilters[filter];
  if (!resolvedFilter) {
    throw new APIError("Invalid date filter", 400);
  }

  const { startDate, endDate } = getFilteredTime(resolvedFilter);

  const monthLabels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const weekLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hourLabel = (hour) => {
    if (hour === 0) return "12 AM";
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return "12 PM";
    return `${hour - 12} PM`;
  };

  let labels = [];
  let groupId = null;
  let resultKey = null;

  switch (resolvedFilter) {
    case "today":
      labels = [0, 3, 6, 9, 12, 15, 18, 21].map(hourLabel);
      groupId = {
        $multiply: [{ $floor: { $divide: [{ $hour: "$createdAt" }, 3] } }, 3],
      };
      resultKey = (item) => hourLabel(item._id);
      break;
    case "yesterday":
      labels = [0, 4, 8, 12, 16, 20].map(hourLabel);
      groupId = {
        $multiply: [{ $floor: { $divide: [{ $hour: "$createdAt" }, 4] } }, 4],
      };
      resultKey = (item) => hourLabel(item._id);
      break;
    case "this_week":
      labels = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(
          Date.UTC(
            startDate.getUTCFullYear(),
            startDate.getUTCMonth(),
            startDate.getUTCDate() + i,
          ),
        );
        labels.push(`${weekLabels[date.getUTCDay()]} ${date.getUTCDate()}`);
      }
      groupId = {
        day: { $dayOfMonth: "$createdAt" },
        weekday: { $dayOfWeek: "$createdAt" },
      };
      resultKey = (item) =>
        `${weekLabels[item._id.weekday - 1]} ${item._id.day}`;
      break;
    case "this_month": {
      const daysInMonth = new Date(
        Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 0),
      ).getUTCDate();

      labels = Array.from(
        { length: daysInMonth },
        (_, index) => `${index + 1}`,
      );
      groupId = { $dayOfMonth: "$createdAt" };
      resultKey = (item) => `${item._id}`;
      break;
    }
    case "this_year":
      labels = monthLabels;
      groupId = { $month: "$createdAt" };
      resultKey = (item) => monthLabels[item._id - 1];
      break;
    default:
      labels = [];
      groupId = null;
      resultKey = () => null;
      break;
  }

  const [chartResult] = await Order.aggregate([
    {
      $match: {
        actionStatus: "active",
        createdAt: {
          $gte: startDate,
          $lt: endDate,
        },
      },
    },
    {
      $facet: {
        totalOrders: [{ $count: "count" }],
        totalRevenue: [
          {
            $match: {
              paymentStatus: "paid",
              orderStatus: "delivered",
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$totalPrice" },
            },
          },
        ],
        ordersData: [
          {
            $group: {
              _id: groupId,
              total: { $sum: 1 },
            },
          },
          {
            $sort: { _id: 1 },
          },
        ],
        earningsData: [
          {
            $match: {
              paymentStatus: "paid",
              orderStatus: "delivered",
            },
          },
          {
            $group: {
              _id: groupId,
              total: { $sum: "$totalPrice" },
            },
          },
          {
            $sort: { _id: 1 },
          },
        ],
      },
    },
    {
      $project: {
        totalOrders: {
          $ifNull: [{ $arrayElemAt: ["$totalOrders.count", 0] }, 0],
        },
        totalRevenue: {
          $ifNull: [{ $arrayElemAt: ["$totalRevenue.total", 0] }, 0],
        },
        ordersData: 1,
        earningsData: 1,
      },
    },
  ]);

  const orderBuckets = Object.fromEntries(labels.map((label) => [label, 0]));
  const earningBuckets = Object.fromEntries(labels.map((label) => [label, 0]));

  for (const item of chartResult?.ordersData || []) {
    const label = resultKey(item);
    if (label in orderBuckets) {
      orderBuckets[label] = item.total;
    }
  }

  for (const item of chartResult?.earningsData || []) {
    const label = resultKey(item);
    if (label in earningBuckets) {
      earningBuckets[label] = item.total;
    }
  }

  return res.status(200).json({
    success: true,
    message: "Earning revenue data found",
    totalOrders: chartResult?.totalOrders,
    totalRevenue: chartResult?.totalRevenue,
    labels,
    ordersData:labels.map((label)=> orderBuckets[label]),
    earningsData:labels.map((label)=> earningBuckets[label]),
  });
});

// top sales products...............
const topProductsAdminController = asyncHandler(async (req, res) => {});

// sales by categories with chart data....................
const categorySalesAdminController = asyncHandler(async (req, res) => {});

// recent orders.....
const recentOrdersAdminController = asyncHandler(async (req, res) => {});

// website visitors with chart data....
const websiteVisitorsAdminController = asyncHandler(async (req, res) => {});

export { totalSummaryAdminController, earningRevenueAdminController };
