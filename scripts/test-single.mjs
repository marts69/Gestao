import jwt from 'jsonwebtoken';
const token = jwt.sign({ id: 'admin', papel: 'supervisor' }, 'minha_chave_secreta_super_segura', { expiresIn: '8h' });
const payload = {
  clientName: "Stress Test", contact: "(11) 99999-0000",
  date: "2026-04-05", time: "10:00",
  assignedEmployeeId: "b0dc500d-c899-40d6-a941-4c72c0400023",
  services: ["Massagem Relaxante"]
};
fetch("http://localhost:3333/api/agendamentos", {
  method: "POST", body: JSON.stringify(payload),
  headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
}).then(r => r.text()).then(console.log).catch(console.error);
