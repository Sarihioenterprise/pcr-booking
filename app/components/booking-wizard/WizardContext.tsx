"use client";

import React, { createContext, useContext, useReducer } from "react";
import { WizardState, WizardAction, INITIAL_STATE, InspectionZone } from "./types";

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "SET_DATES":
      return { ...state, ...action.payload };
    case "SET_VEHICLE":
      return {
        ...state,
        vehicle: action.payload.vehicle,
        vehicle_subtotal: action.payload.vehicle_subtotal,
        grand_total: action.payload.grand_total,
      };
    case "SET_ADDONS":
      return {
        ...state,
        addons: action.payload.addons,
        addons_total: action.payload.addons_total,
        grand_total: action.payload.grand_total,
      };
    case "SET_CUSTOMER":
      return { ...state, ...action.payload };
    case "SET_BOOKING":
      return {
        ...state,
        booking_id: action.payload.booking_id,
        booking_number: action.payload.booking_number,
      };
    case "SET_AGREEMENT":
      return {
        ...state,
        agreement_id: action.payload.agreement_id,
        sign_token: action.payload.sign_token,
        signature_data_url: action.payload.signature_data_url,
      };
    case "SET_PAYMENT":
      return { ...state, ...action.payload };
    case "SET_INSPECTION":
      return {
        ...state,
        pickup_inspection_id: action.payload.pickup_inspection_id,
        inspection_zones: action.payload.inspection_zones,
      };
    case "UPDATE_ZONE":
      return {
        ...state,
        inspection_zones: state.inspection_zones.map((z) =>
          z.zone === action.payload.zone
            ? { ...z, ...action.payload.updates }
            : z
        ),
      };
    default:
      return state;
  }
}

interface WizardContextValue {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(wizardReducer, INITIAL_STATE);
  return (
    <WizardContext.Provider value={{ state, dispatch }}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used inside WizardProvider");
  return ctx;
}
