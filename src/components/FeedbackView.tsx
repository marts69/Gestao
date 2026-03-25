import React, { useState } from 'react';
import { motion } from 'motion/react';

const THERAPISTS = [
  {
    id: 'helena',
    name: 'Helena Silva',
    role: 'Massoterapia',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDMFmxPTJXej6YvdZmfFRFPwiPnsWZwayD0JV_-RylfklIcC66-jUZ2NTEotaVy1poPFY-3kG8oXOUCNcbGIMFWq2cN7NkatUVlm2rSLN8mvvApxzgmozhNEVLsx-91BgCO9sw2ErO0Wzk-8x39g77Ur6nP7X2vttqSdgX_XyWaWkCfI0oq57izVZvy0MTvaFu8L6H_AMBlCToyMj1915Dwzw1Z9jz9Ytrry2UhdxETdthkvbnNLrUCgvvk11biiYgLksIbOYinPJVp'
  },
  {
    id: 'marcos',
    name: 'Marcos Oliveira',
    role: 'Estética',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAPc-5DakDcaquzRNvi8w4L_4X-umtBBos7SRXLbWjV4fXyfiz8yAH7wtBpCCxzz8eT2kzw1zCE0EPzM58ERdICPIIHOiUeDp4IcE4LjDHAB-9Pt-eAG65qQa-hvtY2GyC1TBZ_RnUjohQNOozo8-gwq9GIu7xCSJ7y-NvqtCGuHht-iChPrNZEfxebaBNcxpPixGtxDg1d9qsP_ei3IhzKTnSHRpDyK8boXav1JbfImqxL0QD-d9mT_S4ucRawrXB4Sw0XPsqmFDxy'
  },
  {
    id: 'ana',
    name: 'Ana Luiza',
    role: 'Yoga & Meditação',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAXgILDN5SGfRQAoZd5ExbfdrEJ_RXDm3BLoa-xRwrw4CcOB_gzJWzGIvGyp6jsRqAyFdvvKMbwvKsV31Rm1wUaGRgqtN7KC1IjtDmOm30UGuw95HpI1oKWu-JQ25C4B_CJDEuAmkuUyhePw56Vdh_qifpqWSeIDNmZ_Q6hsDGFLrwPhkInCZqaak-7tyzq1lWgEfI3XFt6E7ofTyXfzmYRyrr4uwD0-tLAY5RK-md9DQGSYhlNXAqrv_ARpwsA4ftd5fJG2jZvLlsD'
  }
];

interface FeedbackViewProps {
  onSubmit: () => void;
}

export function FeedbackView({ onSubmit }: FeedbackViewProps) {
  const [selectedTherapist, setSelectedTherapist] = useState<string>('helena');
  const [rating, setRating] = useState<number>(4);
  const [hoveredRating, setHoveredRating] = useState<number>(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const getRatingText = (val: number) => {
    switch (val) {
      case 1: return 'Decepcionante';
      case 2: return 'Abaixo do Esperado';
      case 3: return 'Satisfatório';
      case 4: return 'Muito Bom';
      case 5: return 'Excepcional';
      default: return 'Avalie sua experiência';
    }
  };

  const currentRatingDisplay = hoveredRating > 0 ? hoveredRating : rating;

  return (
    <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
      {/* Left Side: Editorial Context */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="lg:col-span-5 space-y-12 lg:sticky lg:top-32"
      >
        <div className="space-y-6">
          <div className="inline-block px-3 py-1 bg-primary-container text-on-primary-container text-[10px] font-bold uppercase tracking-[0.2em] rounded">
            Guest Feedback
          </div>
          <h1 className="text-6xl font-headline text-primary leading-[1.1]">
            Elegância em cada <span className="italic font-normal">detalhe</span>.
          </h1>
          <p className="text-on-surface-variant text-lg leading-relaxed font-body max-w-md">
            Esperamos que sua estadia na suíte 402 esteja sendo revigorante. Sua avaliação sobre os serviços de bem-estar é essencial para mantermos nossa promessa de exclusividade e cuidado.
          </p>
        </div>
        <div className="relative rounded-2xl overflow-hidden aspect-[3/4] shadow-2xl">
          <img 
            alt="Ambiente relaxante de Spa" 
            className="object-cover w-full h-full" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAQetAuWWvsJtH-FD9gzO7J8XchCB4y1Eq2k7ReFfcbBaA_mH90SQj1kuprCd4j1j0viFCviOjypDyxeiQuDAg9WIcpbWSlxmGxDGP0awmzTvXr03CDCRxf-CHQ5-gG5vr5LQwmxKkwqXlvIHjaNtGaVHh-G6HIVfUhpPCdPbrN6beE-_ZkouMMbexUGUChFPFEO14bKw04i8AkT5CUO3Adx_en7PntB0VbAfYHhX_Hcsz9iCmDValjOYLqTPhQ241Ou5OmQM4pvWUm"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40"></div>
        </div>
      </motion.div>

      {/* Right Side: Evaluation Form */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        className="lg:col-span-7"
      >
        <div className="bg-surface-container-lowest p-8 md:p-16 rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] border border-outline-variant/10">
          <form className="space-y-12" onSubmit={handleSubmit}>
            
            {/* Employee Selection Section */}
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <label className="block text-xs font-label font-bold text-on-surface-variant tracking-[0.15em] uppercase">
                  Especialista Responsável
                </label>
                <span className="text-[10px] text-outline italic">Selecione o profissional</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {THERAPISTS.map((therapist) => {
                  const isSelected = selectedTherapist === therapist.id;
                  return (
                    <button
                      key={therapist.id}
                      type="button"
                      onClick={() => setSelectedTherapist(therapist.id)}
                      className={`group flex flex-col items-center p-6 rounded-2xl transition-all ${
                        isSelected 
                          ? 'border-2 border-primary bg-primary/5' 
                          : 'border border-outline-variant/20 bg-surface-container-low hover:border-primary/40 hover:bg-surface-container'
                      }`}
                    >
                      <div className={`w-20 h-20 rounded-full overflow-hidden mb-4 transition-all ${
                        isSelected ? 'border-2 border-primary shadow-lg' : 'grayscale group-hover:grayscale-0 opacity-80 group-hover:opacity-100'
                      }`}>
                        <img 
                          alt={`Terapeuta ${therapist.name}`} 
                          className="w-full h-full object-cover" 
                          src={therapist.image}
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <span className={`text-sm font-semibold ${isSelected ? 'text-primary font-bold' : 'text-on-surface'}`}>
                        {therapist.name}
                      </span>
                      <span className={`text-[10px] uppercase tracking-widest mt-1 ${isSelected ? 'text-on-primary-fixed-variant' : 'text-on-surface-variant'}`}>
                        {therapist.role}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rating Section */}
            <div className="space-y-6 py-10 border-y border-outline-variant/10 text-center">
              <label className="block text-xs font-label font-bold text-on-surface-variant tracking-[0.15em] uppercase">
                Sua Experiência
              </label>
              <div className="flex justify-center gap-3" onMouseLeave={() => setHoveredRating(0)}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`material-symbols-outlined text-4xl cursor-pointer transition-colors ${
                      star <= (hoveredRating || rating) ? 'star-active' : 'text-outline-variant hover:text-primary'
                    }`}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                  >
                    star
                  </span>
                ))}
              </div>
              <p className="text-xs text-primary font-bold uppercase tracking-[0.2em] h-4">
                {getRatingText(currentRatingDisplay)}
              </p>
            </div>

            {/* Comments Section */}
            <div className="space-y-4">
              <label className="block text-xs font-label font-bold text-on-surface-variant tracking-[0.15em] uppercase">
                Observações Adicionais
              </label>
              <textarea 
                className="w-full bg-surface/50 border border-outline-variant/30 rounded-2xl p-6 focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none text-on-surface placeholder:text-outline-variant/60 font-body resize-none transition-all" 
                placeholder="Gostaria de destacar algum momento especial ou sugerir uma melhoria?" 
                rows={5}
              ></textarea>
            </div>

            {/* Action Section */}
            <div className="pt-6 space-y-6">
              <button 
                type="submit"
                className="w-full bg-primary text-on-primary py-6 rounded-full font-bold text-sm uppercase tracking-[0.2em] shadow-xl hover:bg-primary-dim hover:-translate-y-0.5 transition-all active:scale-[0.98]"
              >
                Enviar Feedback Premium
              </button>
              <div className="flex flex-col items-center gap-2">
                <div className="h-px w-12 bg-outline-variant/30"></div>
                <p className="text-center text-[10px] text-on-surface-variant font-medium uppercase tracking-widest leading-loose">
                  Privacidade absoluta garantida.<br/>Serviço de Atendimento ao Hóspede Serenidade.
                </p>
              </div>
            </div>

          </form>
        </div>
      </motion.div>
    </div>
  );
}
