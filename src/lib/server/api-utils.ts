import { NextResponse } from "next/server";
import { UnauthorizedError, ForbiddenError } from "./auth";

export class NotFoundError extends Error {}
export class BadRequestError extends Error {}
/** No account "Parent PIN" has been set yet — the client should prompt the guardian to create one. */
export class PinRequiredError extends Error {}
/** A Parent PIN was supplied but it was wrong (or missing where one is required). */
export class PinInvalidError extends Error {}

export function handleApiError(e: unknown) {
  if (e instanceof PinRequiredError) {
    return NextResponse.json({ error: e.message, code: "PARENT_PIN_REQUIRED" }, { status: 403 });
  }
  if (e instanceof PinInvalidError) {
    return NextResponse.json({ error: e.message, code: "PARENT_PIN_INVALID" }, { status: 403 });
  }
  if (e instanceof UnauthorizedError) {
    return NextResponse.json({ error: e.message }, { status: 401 });
  }
  if (e instanceof ForbiddenError) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  if (e instanceof NotFoundError) {
    return NextResponse.json({ error: e.message }, { status: 404 });
  }
  if (e instanceof BadRequestError) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
  console.error(e);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}
