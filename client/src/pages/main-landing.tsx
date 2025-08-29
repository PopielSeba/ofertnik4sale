import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Briefcase } from "lucide-react";

export default function MainLanding() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-500 via-blue-400 to-gray-100">
      <div className="container mx-auto px-4 py-16 flex flex-col justify-center items-center min-h-screen">
        {/* Title */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Witaj w OFERTNIKU -  systemie wycen online wynajmu sprzętu dla GRUPY REKORD.
          </h1>
        </div>

        {/* Asymmetric layout - Client centered, Employee on the right */}
        <div className="flex flex-col md:flex-row gap-8 max-w-6xl w-full items-center justify-center">
          {/* Client Card - centered */}
          <Card 
            className="hover:scale-105 transition-transform duration-300 cursor-pointer bg-white/95 backdrop-blur-sm border-0 shadow-2xl w-full max-w-md"
            onClick={() => setLocation("/client-portal")}
          >
            <CardContent className="p-12 text-center">
              <div className="bg-blue-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-12 h-12 text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                KLIENT
              </h2>
              <p className="text-gray-600 text-lg">
                Poznaj naszą ofertę z natychmiastową wyceną online wynajmowanego sprzętu.
              </p>
            </CardContent>
          </Card>

          {/* Employee Card - positioned to the right */}
          <Card 
            className="hover:scale-105 transition-transform duration-300 cursor-pointer bg-white/95 backdrop-blur-sm border-0 shadow-2xl w-80 md:ml-8"
            onClick={() => setLocation("/employee-portal")}
          >
            <CardContent className="p-8 text-center">
              <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-10 h-10 text-orange-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">
                PRACOWNIK
              </h2>
              <p className="text-gray-600">
                System wycen, zarządzanie flotą sprzętu i portal administracyjny
              </p>
            </CardContent>
          </Card>
        </div>

        {/* SEO Keywords */}
        <div className="mt-16 text-center text-white/60 text-xs max-w-4xl mx-auto">
          <p className="leading-relaxed">
            System wycen online | Wyceniarka automatyczna | Portal klienta | Ofertownik online | Wynajem sprzętu budowlanego | Agregaty prądotwórcze | Kalkulator wynajmu | Zarządzanie flotą | Wyceny automatyczne | Rabaty progresywne
          </p>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-white/70 text-xs">
          <p>System Wycen Ofertnik by PPP :: PROGRAM Sebastian Popiel, tel. +48 500 600 525</p>
        </div>
      </div>
    </div>
  );
}