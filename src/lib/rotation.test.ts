import { describe, it, expect } from "vitest";
import { rotateLeft, generateSchedule } from "./rotation";

describe("rotateLeft", () => {
  it("rota a la izquierda", () => {
    expect(rotateLeft(["A", "B", "C"], 1)).toEqual(["B", "C", "A"]);
    expect(rotateLeft(["A", "B", "C"], 2)).toEqual(["C", "A", "B"]);
  });
  it("offset 0 no cambia el orden", () => {
    expect(rotateLeft(["A", "B", "C"], 0)).toEqual(["A", "B", "C"]);
  });
  it("offset múltiplo de N vuelve al inicio", () => {
    expect(rotateLeft(["A", "B", "C"], 3)).toEqual(["A", "B", "C"]);
    expect(rotateLeft(["A", "B", "C"], 6)).toEqual(["A", "B", "C"]);
  });
  it("maneja lista vacía", () => {
    expect(rotateLeft([], 2)).toEqual([]);
  });
});

const members = ["p1", "p2", "p3", "p4", "p5", "p6"];
// 18:00 hora Bogotá == 23:00 UTC
const pub = new Date("2026-07-25T23:00:00.000Z");

describe("generateSchedule — horarios", () => {
  it("primer turno = publicación + intervalo, y espaciado uniforme", () => {
    const s = generateSchedule({
      activeUserIds: members,
      publicationDatetime: pub,
      intervalMinutes: 20,
      completionWindowMinutes: 40,
      rotationIndex: 0,
    });
    // 6:20, 6:40, 7:00, 7:20, 7:40, 8:00 (hora Bogotá)
    const mins = s.map(
      (x) => (x.assignedDatetime.getTime() - pub.getTime()) / 60000,
    );
    expect(mins).toEqual([20, 40, 60, 80, 100, 120]);
  });

  it("nunca asigna dos personas al mismo horario", () => {
    const s = generateSchedule({
      activeUserIds: members,
      publicationDatetime: pub,
      intervalMinutes: 15,
      completionWindowMinutes: 30,
      rotationIndex: 3,
    });
    const times = s.map((x) => x.assignedDatetime.getTime());
    expect(new Set(times).size).toBe(times.length);
  });

  it("la fecha límite = horario asignado + ventana", () => {
    const s = generateSchedule({
      activeUserIds: members,
      publicationDatetime: pub,
      intervalMinutes: 20,
      completionWindowMinutes: 40,
      rotationIndex: 0,
    });
    for (const slot of s) {
      const diff =
        (slot.deadlineDatetime.getTime() - slot.assignedDatetime.getTime()) /
        60000;
      expect(diff).toBe(40);
    }
  });

  it("asigna posiciones 0..N-1 en orden", () => {
    const s = generateSchedule({
      activeUserIds: members,
      publicationDatetime: pub,
      intervalMinutes: 20,
      completionWindowMinutes: 40,
      rotationIndex: 2,
    });
    expect(s.map((x) => x.rotationPosition)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe("generateSchedule — rotación balanceada", () => {
  it("el primero rota en cada publicación", () => {
    const first = (idx: number) =>
      generateSchedule({
        activeUserIds: members,
        publicationDatetime: pub,
        intervalMinutes: 20,
        completionWindowMinutes: 40,
        rotationIndex: idx,
      })[0].userId;
    expect(first(0)).toBe("p1");
    expect(first(1)).toBe("p2");
    expect(first(2)).toBe("p3");
  });

  it("tras N publicaciones cada persona fue primera exactamente una vez", () => {
    const firsts = new Set<string>();
    for (let i = 0; i < members.length; i++) {
      const s = generateSchedule({
        activeUserIds: members,
        publicationDatetime: pub,
        intervalMinutes: 20,
        completionWindowMinutes: 40,
        rotationIndex: i,
      });
      firsts.add(s[0].userId);
    }
    expect(firsts.size).toBe(members.length);
  });

  it("el orden completo coincide con el ejemplo del requerimiento", () => {
    const s = generateSchedule({
      activeUserIds: members,
      publicationDatetime: pub,
      intervalMinutes: 20,
      completionWindowMinutes: 40,
      rotationIndex: 1,
    });
    // Publicación 2: p2, p3, p4, p5, p6, p1
    expect(s.map((x) => x.userId)).toEqual([
      "p2",
      "p3",
      "p4",
      "p5",
      "p6",
      "p1",
    ]);
  });
});

describe("generateSchedule — validaciones", () => {
  it("lista vacía => sin horarios", () => {
    expect(
      generateSchedule({
        activeUserIds: [],
        publicationDatetime: pub,
        intervalMinutes: 20,
        completionWindowMinutes: 40,
        rotationIndex: 0,
      }),
    ).toEqual([]);
  });
  it("intervalo inválido lanza error", () => {
    expect(() =>
      generateSchedule({
        activeUserIds: members,
        publicationDatetime: pub,
        intervalMinutes: 0,
        completionWindowMinutes: 40,
        rotationIndex: 0,
      }),
    ).toThrow();
  });
});
