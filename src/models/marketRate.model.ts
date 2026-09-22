import mongoose, { Document, Schema, Types } from "mongoose";

export type MarketRateKind = "gold-silver" | "petrol";

export const MARKET_RATE_KINDS: MarketRateKind[] = ["gold-silver", "petrol"];

export interface IGoldSilverValues {
  goldPerTola: number;
  goldPerGram: number;
  silverPerTola: number;
  silverPerGram: number;
}

export interface IPetrolValues {
  petrolPerLiter: number;
  dieselPerLiter: number;
  keroseneperLiter: number;
}

export type MarketRateValues = IGoldSilverValues | IPetrolValues;

export interface IMarketRate extends Document {
  _id: Types.ObjectId;
  kind: MarketRateKind;
  values: MarketRateValues;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Staff-entered figures (no reliable free API exists for these in Nepal, see
// docs/vision.md) — `values` is a loose Mixed blob validated per-kind at the
// zod layer (marketRate.validation.ts) rather than a rigid Mongoose subschema,
// since the shape differs per `kind`.
const marketRateSchema = new Schema<IMarketRate>(
  {
    kind: {
      type: String,
      enum: MARKET_RATE_KINDS,
      required: true,
      unique: true,
      immutable: true,
    },
    values: { type: Schema.Types.Mixed, default: {} },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

const MarketRate = mongoose.model<IMarketRate>("MarketRate", marketRateSchema);

export default MarketRate;
