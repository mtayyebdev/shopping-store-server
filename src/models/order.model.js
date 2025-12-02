import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    shippingAddress: {
      username: String,
      phone: String,
      address: String,
      city: String,
      region: String,
      district: String,
      landmark: String,
      shipTo: String,
    },
    orderStatus: {
      type: String,
      enum: ["Pending", "Processing", "Shipped", "Delivered","Cancelled"],
      default: "Pending",
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: String,
        price: Number,
        quantity: Number,
        image: String,
      },
    ],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    paymentMethod:{
        type:String,
        enum:["Strip","Paypal","COD","JazzCash","EasyPaisa"],
        default:"COD"
    },
    paymentResult:{
        id:String,
        status:String,
        update_time:String,
        email_address:String
    },
    itemsPrice:Number,
    shippingPrice:Number,
    taxPrice:Number,
    totalPrice:Number,
    isPaid:{
        type:Boolean,
        default:false
    },
    paidAt:Date,
    isDelivered:{
         type:Boolean,
        default:false
    },
    deliveredAt:Date,
  },
  { timestamps: true }
);
const Order = mongoose.model("Order", orderSchema);
export default Order;
