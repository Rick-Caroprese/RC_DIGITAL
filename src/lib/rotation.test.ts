import { describe, it, expect } from "vitest";
import { rotateLeft, generateAccountSchedule, type PersonAccounts } from "./rotation";

describe("rotateLeft", () => {
  it("rota a la izquierda", () => {
    expect(rotateLeft(["A", "B", "C"], 1)).toEqual(["B", "C", "A"]);
    expect(rotateLeft(["A", "B", "C"], 2)).toEqual(["C", "A", "B"]);
  });
  it("offset 0 y múltiplos de N no cambian el orden", () => {
    expect(rotateLeft(["A", "B", "C"], 0)).toEqual(["A", "B", "C"]);
    expect(rotateLeft(["A", "B", "C"], 3)).toEqual(["A", "B", "C"]);
  });
  it("maneja lista vacía", () => {
    expect(rotateLeft([], 2)).toEqual([]);
  });
});

const pub = new Date("2026-07-25T21:00:00.000Z"); // 4:00 p. m. Bogotá
const two: PersonAccounts[] = [
  { userId: "p1", accountIds: ["a1", "a2", "a3"] },
  { userId: "p2", accountIds: ["b1", "b2", "b3"] },
];
const minutesFromPub = (d: Date) => (d.getTime() - pub.getTime()) / 60000;

describe("generateAccountSchedule — distribución", () => {
  it("primera cuenta en la publicación y última al final de la ventana", () => {
    const s = generateAccountSchedule({
      peopleAccounts: two,
      publicationDatetime: pub,
      totalWindowMinutes: 360,
      completionWindowMinutes: 40,
      rotationIndex: 0,
    });
    expect(s.length).toBe(6);
    expect(minutesFromPub(s[0].assignedDatetime)).toBe(0);
    expect(minutesFromPub(s[s.length - 1].assignedDatetime)).toBe(360);
  });

  it("nunca asigna dos cuentas al mismo horario", () => {
    const s = generateAccountSchedule({
      peopleAccounts: two,
      publicationDatetime: pub,
      totalWindowMinutes: 480,
      completionWindowMinutes: 40,
      rotationIndex: 2,
    });
    const times = s.map((x) => x.assignedDatetime.getTime());
    expect(new Set(times).size).toBe(times.length);
  });

  it("las cuentas de una misma persona quedan repartidas parejo (anti-patrón)", () => {
    const s = generateAccountSchedule({
      peopleAccounts: two,
      publicationDatetime: pub,
      totalWindowMinutes: 360,
      completionWindowMinutes: 40,
      rotationIndex: 0,
    });
    const p1 = s.filter((x) => x.userId === "p1").map((x) => minutesFromPub(x.assignedDatetime));
    // step = 360/5 = 72; p1 en posiciones 0,2,4 -> 0, 144, 288
    expect(p1).toEqual([0, 144, 288]);
    // separación mínima entre cuentas de la misma persona
    expect(p1[1] - p1[0]).toBe(144);
  });

  it("la fecha límite = horario asignado + ventana de finalización", () => {
    const s = generateAccountSchedule({
      peopleAccounts: two,
      publicationDatetime: pub,
      totalWindowMinutes: 360,
      completionWindowMinutes: 40,
      rotationIndex: 0,
    });
    for (const slot of s) {
      const diff = (slot.deadlineDatetime.getTime() - slot.assignedDatetime.getTime()) / 60000;
      expect(diff).toBe(40);
    }
  });
});

describe("generateAccountSchedule — rotación e intercalado", () => {
  it("rota quién empieza según rotationIndex", () => {
    const first = (idx: number) =>
      generateAccountSchedule({
        peopleAccounts: two,
        publicationDatetime: pub,
        totalWindowMinutes: 360,
        completionWindowMinutes: 40,
        rotationIndex: idx,
      })[0].userId;
    expect(first(0)).toBe("p1");
    expect(first(1)).toBe("p2");
  });

  it("intercala por persona (round-robin)", () => {
    const s = generateAccountSchedule({
      peopleAccounts: two,
      publicationDatetime: pub,
      totalWindowMinutes: 360,
      completionWindowMinutes: 40,
      rotationIndex: 0,
    });
    // orden: a1, b1, a2, b2, a3, b3
    expect(s.map((x) => x.accountId)).toEqual(["a1", "b1", "a2", "b2", "a3", "b3"]);
  });

  it("soporta un número de cuentas distinto por persona", () => {
    const mixed: PersonAccounts[] = [
      { userId: "p1", accountIds: ["a1", "a2"] },
      { userId: "p2", accountIds: ["b1"] },
    ];
    const s = generateAccountSchedule({
      peopleAccounts: mixed,
      publicationDatetime: pub,
      totalWindowMinutes: 120,
      completionWindowMinutes: 30,
      rotationIndex: 0,
    });
    expect(s.map((x) => x.accountId)).toEqual(["a1", "b1", "a2"]);
    expect(s.length).toBe(3);
  });
});

describe("generateAccountSchedule — validaciones", () => {
  it("sin integrantes con cuentas => vacío", () => {
    expect(
      generateAccountSchedule({
        peopleAccounts: [{ userId: "p1", accountIds: [] }],
        publicationDatetime: pub,
        totalWindowMinutes: 120,
        completionWindowMinutes: 30,
        rotationIndex: 0,
      }),
    ).toEqual([]);
  });
  it("ventana inválida lanza error", () => {
    expect(() =>
      generateAccountSchedule({
        peopleAccounts: two,
        publicationDatetime: pub,
        totalWindowMinutes: 0,
        completionWindowMinutes: 30,
        rotationIndex: 0,
      }),
    ).toThrow();
  });
  it("una sola cuenta se coloca en la publicación", () => {
    const s = generateAccountSchedule({
      peopleAccounts: [{ userId: "p1", accountIds: ["a1"] }],
      publicationDatetime: pub,
      totalWindowMinutes: 120,
      completionWindowMinutes: 30,
      rotationIndex: 0,
    });
    expect(s.length).toBe(1);
    expect(minutesFromPub(s[0].assignedDatetime)).toBe(0);
  });
});
