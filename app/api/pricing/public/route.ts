import { getPublicPricingPlans } from "@/actions/prices/public";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await getPublicPricingPlans();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in pricing API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}